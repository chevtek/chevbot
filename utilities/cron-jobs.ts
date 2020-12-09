import moment from "moment-timezone";
import sloganChecker from "./slogan-checker";
import onThisDay from "./on-this-day";
// import eventReminders from "./event-reminders";

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

    } catch (err) {
      console.log(err);
    }
  }, 60 * 1000);
}