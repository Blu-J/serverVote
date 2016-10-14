require('dotenv').config();
const sendgrid = require('sendgrid');
const privateKey = process.env.SERVER_VOTE_PEM;
const Encrypt = require('node-rsa');
const emailAddress = require('./resources/emailAddresses.json') || [];
const crypt = new Encrypt(privateKey);

const helper = sendgrid.mail;
const from_email = new helper.Email('justin.miller@logrhythm.com');
const templateContent = (emailAddress) => `<p>Hello,</p><p>
My hackathon was to fix the problem with our voting, also known as <a href="https://en.wikipedia.org/wiki/First-past-the-post_voting">first past the post</a>. So I have elected to use a approval method for casting the vote, and to determine the votes via the <a href="https://en.wikipedia.org/wiki/Schulze_method">schulze method</a> or the <a href="https://en.wikipedia.org/wiki/Range_voting">range voting system</a>. I like the range voting the best, but both methods are better than <a href="https://en.wikipedia.org/wiki/Instant-runoff_voting">instant run off</a> and <a href="https://en.wikipedia.org/wiki/First-past-the-post_voting">first past the post</a>.</p>
<p>So please, take the chance to <a href="http://algorithmalchemist.net/?id=${crypt.encrypt(emailAddress, 'base64')})">cast your vote</a>, or <a href="http://ec2-52-40-203-50.us-west-2.compute.amazonaws.com/?id=${crypt.encrypt(emailAddress, 'base64')})">alternative link(alternative)</a>.
Then you can go to <a href="http://algorithmalchemist.net/getResults">results</a>, or if you want the <a href="http://algorithmalchemist.net/getResults">raw results</a>.</p>
<p>For more information on voting, I would look into <a href="https://followmyvote.com/majority-voting-systems/">Majority Voting Systems</a>, which references ccgray’s videos on voting.</p>
`;

const sendMail = (emailAddress) => {
  const to_email = new helper.Email(emailAddress);
  const subject = 'Vote for the best; Hackathon';
  const content = new helper.Content('text/html', templateContent(emailAddress));
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
