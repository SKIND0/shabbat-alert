const twilio = require('twilio');
require('dotenv').config();

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

async function sendSMS(to, message) {
    try {
        const result = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: to
        });
        console.log('SMS sent:', result.sid);
        return { success: true, sid: result.sid };
    } catch (err) {
        console.error('SMS failed:', err.message);
        return { success: false, error: err.message };
    }
}

module.exports = { sendSMS };
