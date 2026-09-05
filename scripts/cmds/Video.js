!cmd install video2.js const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const ytSearch = require("yt-search");

const API = "https://www.noobs-apis.run.place";
const CACHE = path.join(__dirname, "cache");

const isYT = (url) => /(youtu\.be|youtube\.com)/i.test(url);

const safeName = (name = "video") =>
  name.replace(/[\\/:*?"<>|]/g, "").slice(0, 60) || "video";

const getUrl = (d) =>
  d?.downloads?.data?.fileUrl ||
  d?.downloads?.data?.url ||
  d?.url;

module.exports = {
  config: {
    name: "video2",
    aliases: ["vd2"],
    version: "3.0",
    author: "AHMED TARIF",
    role: 0,
    countDown: 7,
    prefixRequired: true,
    premium: true,
    category: "Music"
  },

  onStart: async ({ message, event, args }) => {
    fs.ensureDirSync(CACHE);

    const input = args.join(" ").trim();
    if (!input) return message.reply("❌ | video2 <url/name>");

    let file;

    try {
      message.reaction("⏳", event.messageID);

      let url = input, title = "Video";

      // 🔥 STRICT FIRST VIDEO ONLY
      if (!isYT(input)) {
        const res = await ytSearch(input);

        // শুধু real video filter + duration থাকতে হবে (ads/live বাদ)
        const videos = res.videos
          .filter(v => v.type === "video" && v.seconds > 0);

        if (!videos.length) return message.reply("❌ | No video found");

        const first = videos[0]; // 💯 first result

        url = first.url;
        title = first.title;
      }

      const { data } = await axios.get(
        `${API}/nazrul/youtube?type=mp4&url=${encodeURIComponent(url)}`
      );

      const dl = getUrl(data);
      if (!dl) return message.reply("❌ | No download link");

      file = path.join(CACHE, `${safeName(title)}.mp4`);

      const stream = await axios({
        url: dl,
        method: "GET",
        responseType: "stream"
      });

      await new Promise((res, rej) => {
        const writer = fs.createWriteStream(file);
        stream.data.pipe(writer);
        writer.on("finish", res);
        writer.on("error", rej);
      });

      await message.reply({
        body: `✅ | ${title}`,
        attachment: fs.createReadStream(file)
      });

      message.reaction("✅", event.messageID);

    } catch (e) {
      console.log(e);
      message.reaction("❌", event.messageID);
      message.reply("❌ | Failed!");
    } finally {
      if (file && fs.existsSync(file)) fs.unlinkSync(file);
    }
  }
};
