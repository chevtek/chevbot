import dgram from "dgram";
import { VoiceChannel, VoiceConnection } from "discord.js";
import stream from "stream";
import discordClient from "../discord-client";

const vbanStreams: {
  [key: string]: {
    voiceConnection: VoiceConnection,
    pcmAudio: stream.Readable,
    timeout?: NodeJS.Timeout
  }
} = {};

const bitrates = [ 6000, 12000, 24000, 48000, 96000, 192000, 384000, 8000, 16000, 32000, 64000, 128000, 256000, 512000, 11025, 22050, 44100, 88200, 176400, 352800, 705600 ];

let processingNewUser = false;

export default async function () {
  const udp = dgram.createSocket("udp4");
  udp.on("error", console.log);
  udp.on("listening", () => {
    const address = udp.address();
    console.log(`Listening for VBAN packets ${address.address}:${address.port}`);
  });
  udp.on("message", async msg => {
    try {
      const streamName = msg.slice(8,24).filter(byte => byte > 0).toString().toLowerCase();
      let vbanStream = vbanStreams[streamName];
      if (!vbanStream || vbanStream.voiceConnection.status === 4) {
        if (processingNewUser) return;
        processingNewUser = true;
        delete vbanStreams[streamName];
        await Promise.all(discordClient.guilds.cache.map(async guild => {
          const member = guild.members.cache.find(member => member.user.tag.toLowerCase().replace(/#/g, "") === streamName);
          if (member?.voice.channel) {
            const pcmAudio = new stream.Readable();
            pcmAudio.on("error", console.log);
            pcmAudio._read = () => {
              if (pcmAudio.isPaused()) {
                pcmAudio.resume();
              }
            }
            const voiceConnection = await member?.voice.channel.join();
            vbanStream = vbanStreams[streamName] = { voiceConnection, pcmAudio };
          }
        }));
        vbanStream.voiceConnection.play(
          vbanStream.pcmAudio,
          { type: "converted", bitrate: bitrates[msg[4]] }
        );
        processingNewUser = false;
      }
      if (!vbanStream || vbanStream.pcmAudio.isPaused()) return;
      if (vbanStream.timeout) {
        clearTimeout(vbanStream.timeout);
        delete vbanStream.timeout;
      }
      if (vbanStream.timeout) throw new Error("Not supposed to be a timeout here...");
      vbanStream.timeout = setTimeout(() => {
        vbanStream.voiceConnection.disconnect();
        delete vbanStreams[streamName];
      }, 10 * 1000);
      vbanStream.pcmAudio.push(msg.slice(28));
    } catch (err) {
      console.log(err);
    }
  });
  udp.bind(6980, "0.0.0.0");
}