import sloganChecker from "./slogan-checker";
import onThisDay from "./on-this-day";
import eventReminders from "./event-reminders";

export default async function () {
  setInterval(async () => {
    try {

      await Promise.all([
        sloganChecker(),
        onThisDay(),
        eventReminders()
      ]);

    } catch (err) {
      console.log(err);
    }
  }, 60 * 1000);
}