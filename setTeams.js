require('dotenv').config();
const AWS = require("aws-sdk");
const awsKeys = {
  region: "us-west-2",
  accessKeyId: process.env.AMAZON_KEY_ID,
  secretAccessKey: process.env.AMAZON_SECRET_KEY,
};

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


module.exports = (teamNames) => {
  return teamNames.map((teamName) => Maybe.of(teamName)
    .andThen(x => ({
      TableName: 'voteCategories.algorithmalchemist.net',
      Item: {
        value: x,
        isEntry: true,
      }
    }))
    .andThen(putInServer)
    .elseThen(x => console.log('got and error of ', x))
  );
}
