const express = require("express");
const app = express();
const AWS = require("aws-sdk");
const request = require('request');
const privateKey = require('./resources/privateKey') || '';
const Encrypt = require('node-rsa');
const crypt = new Encrypt(privateKey);

const validDecryption = /.*/;
const awsKeys = {
  region: "us-west-2",
  accessKeyId: 'AKIAJ7EZTL6LVRDKPERQ',
  secretAccessKey: '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',
};
const bodyParser = require('body-parser');

AWS.config.update(awsKeys);

const docClient = new AWS.DynamoDB.DocumentClient();
//const doc = require('dynamodb-doc').ddb(;
//const dynamo = new doc.DynamoDB(awsKeys);

const GoodMaybe = function(value) {
    this.type = 'MaybeGood';
    this.value = value;
};
const ErrorMaybe = function(value) {
    this.type = 'MaybeError';
    this.value = value;
};
const PromiseMaybe = function(value) {
  this.type = 'PromiseValue';
  this.value = value;
}
const Maybe = {
    isMaybe: value => {
        return typeof value === 'object' && (value.type === 'MaybeError' || value.type === 'MaybeGood'|| value.type === 'PromiseValue');
    },
    ofError: value => new ErrorMaybe(value),
    of: value => {
      if(Maybe.isMaybe(value)){
        return value;
      }
      if (value instanceof Error) {
        return Maybe.ofError(value);
      }
      if (value && typeof value.then === 'function'){
        return new PromiseMaybe(value);
      }
      return new GoodMaybe(value);
    },
};
function maybeNext(fn){
  console.log(`Mabyenext@${Date.now()} with value of ${JSON.stringify(this)} going thru ${fn.name || fn.toString()}`);
  return Maybe.of(fn(this.value));
}
function maybeSkip(){
  return this;
}
GoodMaybe.prototype.andThen = maybeNext;
GoodMaybe.prototype.elseThen = maybeSkip;
ErrorMaybe.prototype.andThen = maybeSkip;
ErrorMaybe.prototype.elseThen = maybeNext;
PromiseMaybe.prototype.andThen = function PromiseAndThen(fn) {
  return Maybe.of(this.value.then((val) => Maybe.of(val).andThen(fn)));
};
PromiseMaybe.prototype.elseThen =  function PromiseElstThen(fn) {
  return Maybe.of(
    this.value
    .then(
      (val) => Maybe.of(val).elseThen(fn)
    )
    .catch((val) => Maybe.of(val).andThen(fn).elseThen(fn)));
};;



const table = "vote.algorithmalchemist.net";
const Item = options => {
    if (typeof options.id !== 'string')
        return new TypeError('Id is not string');
    return options;
};

const tryParse = value => {
    try{
        return JSON.parse(value);
    }catch(e) {
        return new TypeError(`Could not json parse ${JSON.stringify(value)}`);
    }

};
const toParams = value => {
    return {
        TableName:table,
        Item: value,
    };
};
const putInServer = (value) => {
  return new Promise((resolve, reject) => {
    docClient.put(value, (err, data) => {
        if (err) {
          return reject(`Unable to add item. Error JSON: ${JSON.stringify(err, null, 2)}`);
        } else {
          return resolve(`Added item: ${JSON.stringify(data, null, 2)}`);
        }
    });
  });

};
const goodResponse = (res) => function _goodResponse(message){
  res.send(message);
};
const goodJson =  (res) => function _goodJson(message){
  res.json(message);
};
const badResponse =  (res) => function _badResponse(message){
  res.status(400).send(message);
};


const transformResponse = (responses) => {
  console.log('transformResponse', JSON.stringify(responses));
  return responses.reduce(
      (acc, responseVal) => {
        if (responseVal.isEntry === true){
            acc.entries.push(responseVal.value);
        }
        else{
            acc.categories.push(responseVal.value);
        }
        return acc;
      },
      {
          entries: [],
          categories: [],
      }
  );
};

const docClientSend = (TableName) => {
  return new Promise((resolve, reject) => docClient.scan({ TableName }, (err, resp) => {
    if (err){
      return reject(err.message);
    }
    resolve(resp);
  }));
};

const getItems = (x) => {
  if (!x) {
    return Maybe.ofError('GetItems did not have a value passed');
  }
  if (typeof x.Items !== 'object' || typeof x.Items.length !== 'number' || typeof x.Items.map !== 'function') {
    return Maybe.ofError('GetItems did not have a items as an array passed');
  }
  return x.Items;
};

const filterOutInvalidIds = (items) => items
  .filter((item) => {
    try{
      const decryptedValue = crypt.decrypt(item.id);
      const isValid = validDecryption.test(decryptedValue);
      if (!isValid) {
        console.log(`filterOutInvalidIds -> failed validation for itme of ${JSON.stringify(item)}`)
      }
      return isValid;
    }
    catch(e){
      console.log(`filterOutInvalidIds -> Could not filter out the id for ${JSON.stringify(item)} with error ${e.toString()}`)
      return false;
    }
  });

app.get("/",(req, res) => {
	request('http://algorithmalchemist.net.s3-website-us-west-2.amazonaws.com/vote.html').pipe(res);
});

app.get('/getResults', (req, res) => {
	request('http://algorithmalchemist.net.s3-website-us-west-2.amazonaws.com/voteResults.html').pipe(res);
});

app.get('/getVoteData', (req, res) => {
  Maybe.of(docClientSend('voteCategories.algorithmalchemist.net'))
    .andThen(getItems)
    .andThen(transformResponse)
    .andThen(goodJson(res))
    .elseThen(badResponse(res));
});

app.post('/castVote', bodyParser.json({ type: 'application/json'}), (req, res) => {
  console.log(`req keys are ${Object.keys(req.body)}`);
  return Maybe.of(req.body)
    .andThen(Item)
    .andThen(toParams)
    .andThen(putInServer)
    .andThen(goodResponse(res))
    .elseThen(badResponse(res));
});


app.get('/getVotes', (r, response) => {
  Maybe.of(docClientSend('vote.algorithmalchemist.net'))
    .andThen(getItems)
    .andThen(filterOutInvalidIds)
    .andThen(goodJson(response))
    .elseThen(badResponse(response));
});

app.listen(80);
