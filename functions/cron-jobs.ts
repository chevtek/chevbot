import moment from "moment-timezone";
import sloganChecker from "./slogan-checker";
import onThisDay from "./on-this-day";
import xboxAvailability from "./xbox-availability";
// import eventReminders from "./event-reminders";

export default async function () {
  setInterval(async () => {
    try {

      const now = moment().tz("America/Denver");

      // 6am MST
      if (now.hour() === 6 && now.minute() === 0) {
        await Promise.all([
          onThisDay(),
          sloganChecker(),
          xboxAvailability()
        ]);
      }

      // 6pm MST
      if (now.hour() === 18 && now.minute() === 0) {
        await Promise.all([
          xboxAvailability()
        ]);
      }

    } catch (err) {
      console.log(err);
    }
  }, 60 * 1000);
}