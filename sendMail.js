const sendgrid = require('sendgrid');
const helper = sendgrid.mail;
const from_email = new helper.Email('test@example.com');
const to_email = new helper.Email('test@example.com');
const subject = 'Hello World from the SendGrid Node.js Library!';
const content = new helper.Content('text/plain', 'Hello, Email!');
const mail = new helper.Mail(from_email, subject, to_email, content);

const sg = sendgrid(process.env.SENDGRID_API_KEY);
const request = sg.emptyRequest({
  method: 'POST',
  path: '/v3/mail/send',
  body: mail.toJSON(),
});

sg.API(request, (error, response) => {
  console.log(response.statusCode);
  console.log(response.body);
  console.log(response.headers);
});
