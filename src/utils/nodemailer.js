const nodemailer = require("nodemailer");
const path = require("path");
const ejs = require("ejs");

const sendMail = ({ email, template, data }) => {
  return new Promise(async (resolve, reject) => {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
      },
    });

    const templatePath = path.join(__dirname, '../mails', template);

    // Render the email template with EJS Extenstion
    const html = await ejs.renderFile(templatePath, data);

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Password Reset OTP",
      html,
      // text: `Your OTP for password reset is ${otp}. It is valid for 10 minutes.`,
    };
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error sending email:", err);
        reject(err);
      } else {
        resolve(info);
      }
    });
  });
};

module.exports = sendMail;
