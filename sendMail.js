require('dotenv').config();
const sendgrid = require('sendgrid');
const privateKey = process.env.SERVER_VOTE_PEM;
const Encrypt = require('node-rsa');
const emailAddress = require('./resources/emailAddresses.json') || [];
const crypt = new Encrypt(privateKey);

const helper = sendgrid.mail;
const from_email = new helper.Email('justin.miller@logrhythm.com');

const sendMail = (emailAddress) => {
  const to_email = new helper.Email(emailAddress);
  const subject = 'Vote for the best; Hackathon';
  const content = new helper.Content('text/html', `Hello, Email! <a href="http://algorithmalchemist.net/?id=${crypt.encrypt(emailAddress, 'base64')}">Link to Your voting page, your id is unique</a>`);
  const mail = new helper.Mail(from_email, subject, to_email, content);

  const sg = sendgrid(process.env.SENDGRID_API_KEY);
  const request = sg.emptyRequest({
    method: 'POST',
    path: '/v3/mail/send',
    body: mail.toJSON(),
  });

  sg.API(request, (error, response) => {
    console.log(`Sent mail to ${emailAddress} with a response code of ${response.statusCode} and the body of ${response.body}`);
  });
};

emailAddress.forEach(sendMail);
