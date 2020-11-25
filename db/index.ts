import mongoose from "mongoose";
import sloganmeTemplateSchema from "./models/SloganmeTemplate";
import sloganmeMemberSchema from "./models/SloganmeMember";
import eventSchema from "./models/Event";
import wordSchema from "./models/Word";

import config from "../config";

const { MONGODB_USER, MONGODB_PASS } = config;

interface Models {
  SloganmeTemplate?: any,
  SloganmeMember?: any,
  Event?: any,
  Word?: any
}

const models: Models = {};

export async function initializeDb () {
  await new Promise((resolve, reject) => {
    mongoose.connection.on("error", console.log);
    mongoose.connection.once("open", () => {
      models.SloganmeTemplate = mongoose.model("SloganmeTemplate", sloganmeTemplateSchema);
      models.SloganmeMember = mongoose.model("SloganmeMember", sloganmeMemberSchema);
      models.Event = mongoose.model("Event", eventSchema);
      models.Word = mongoose.model("Word", wordSchema);
      resolve();
    });
    mongoose.connect("mongodb://chevtek.io/chevbot_db", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
      authSource: "admin",
      user: MONGODB_USER,
      pass: MONGODB_PASS
    });
  });
}

export default models;