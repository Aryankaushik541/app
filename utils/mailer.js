import nodemailer from "nodemailer";

const createTransporter = () => {
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_EMAIL &&
    process.env.SMTP_PASSWORD
  ) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  return null;
};

export const sendOtpEmail = async ({ to, otp, name }) => {
  const transporter = createTransporter();
  const subject = "Your MayDesigne login OTP";
  const text = `Hi ${name || "Customer"}, your OTP is ${otp}. It expires in 10 minutes.`;

  if (!transporter) {
    console.log(`OTP for ${to}: ${otp}`);
    return { delivered: false, preview: otp };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_EMAIL,
    to,
    subject,
    text,
  });

  return { delivered: true };
};
