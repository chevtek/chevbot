import moment from "moment-timezone";
import sloganChecker from "./slogan-checker";
import onThisDay from "./on-this-day";
// import eventReminders from "./event-reminders";
import ballotStatus from "./ballot-status";

export default async function () {
  setInterval(async () => {
    try {

      const now = moment().tz("America/Denver");
      if (now.hour() === 6 && now.minute() === 0) {
        await Promise.all([
          onThisDay(),
          sloganChecker()
        ]);
      }
      
      if (now.minute() === 0) {
        await ballotStatus();
      }

    } catch (err) {
      console.log(err);
    }
  }, 60 * 1000);
}