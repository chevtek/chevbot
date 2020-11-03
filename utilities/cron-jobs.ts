import moment from "moment-timezone";
import sloganChecker from "./slogan-checker";
import onThisDay from "./on-this-day";
// import eventReminders from "./event-reminders";
import ballotStatus from "./ballot-status";

export default async function () {
  await ballotStatus();
  setInterval(async () => {
    try {

      const now = moment().tz("America/Denver");
      if (now.hour() === 6 && now.minute() === 0) {
        await Promise.all([
          onThisDay(),
          sloganChecker()
        ]);
      }
      
      if ([0, 15, 30, 45].includes(now.minute())) {
        await ballotStatus();
      }

    } catch (err) {
      console.log(err);
    }
  }, 60 * 1000);
}