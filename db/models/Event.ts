import { Schema } from "mongoose";

export default new Schema({
  title: String,
  date: String,
  description: String,
  notify: String,
  messageId: String,
  channelId: String,
  guildId: String,
  roleId: String
});