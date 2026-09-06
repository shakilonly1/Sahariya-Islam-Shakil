const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const ytSearch = require("yt-search");

const API = "https://api.fastsaver.io/v1/youtube/download";
const API_KEY = process.env.FASTSAVER_KEY;

const CACHE = path.join(__dirname, "cache");

const isYT = (url) =>
  /(youtu\.be|youtube\.com)/i.test(url);

const safeName = (name = "video") =>
  name.replace(/[\\/:*?"<>|]/g, "").slice(0, 60) || "video";

module.exports = {
  config: {
    name: "video2",
    aliases: ["vd2"],
    version: "4.0",
    author: "AHMED TARIF",
    role: 0,
    countDown: 7,
    prefixRequired: true,
    premium: true,
    category: "Music"
  },

  onStart: async ({ message, event, args }) => {
    await fs.ensureDir(CACHE);

    const input = args.join(" ").trim();

    if (!input) {
      return message.reply("❌ | video2 <url/name>");
    }

    if (!API_KEY) {
      return message.reply(
        "❌ | FastSaver API key is not configured."
      );
    }

    let file = null;

    try {
      await message.reaction("⏳", event.messageID);

      let url = input;
      let title = "Video";

      // Search YouTube
      if (!isYT(input)) {
        const res = await ytSearch(input);

        const videos = (res?.videos || [])
          .filter(
            v =>
              v &&
              v.type === "video" &&
              v.url &&
              Number(v.seconds) > 0 &&
              !v.live
          );

        if (!videos.length) {
          await message.reaction("❌", event.messageID);
          return message.reply("❌ | No video found");
        }

        const first = videos[0];

        url = first.url;
        title = first.title || "Video";
      }

      // ==========================
      // FASTSAVER API
      // ==========================

      const { data } = await axios.post(
        API,
        {
          url: url,
          format: "720p"
        },
        {
          headers: {
            "X-Api-Key": API_KEY,
            "Content-Type": "application/json"
          },
          timeout: 120000
        }
      );

      console.log("FastSaver Response:", data);

      if (!data?.ok || !data?.download_url) {
        throw new Error(
          data?.detail ||
          data?.error?.message ||
          "FastSaver did not return download URL"
        );
      }

      const downloadUrl = data.download_url;

      // ==========================
      // DOWNLOAD VIDEO
      // ==========================

      file = path.join(
        CACHE,
        `${safeName(title)}-${Date.now()}.mp4`
      );

      const stream = await axios.get(downloadUrl, {
        responseType: "stream",
        timeout: 180000,
        maxContentLength: 100 * 1024 * 1024,
        maxBodyLength: 100 * 1024 * 1024
      });

      await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(file);

        stream.data.pipe(writer);

        writer.on("finish", resolve);
        writer.on("error", reject);

        stream.data.on("error", reject);
      });

      if (!await fs.pathExists(file)) {
        throw new Error("Video file was not created");
      }

      // ==========================
      // SEND VIDEO
      // ==========================

      await message.reply({
        body: `✅ | ${title}`,
        attachment: fs.createReadStream(file)
      });

      await message.reaction("✅", event.messageID);

    } catch (error) {
      console.error(
        "VIDEO2 ERROR:",
        error?.response?.data ||
        error?.message ||
        error
      );

      try {
        await message.reaction("❌", event.messageID);
      } catch (_) {}

      await message.reply(
        "❌ | Failed to download video.\n\n" +
        "FastSaver API error. Check API key or try another video."
      );

    } finally {
      // Delete temporary file
      if (file) {
        try {
          if (await fs.pathExists(file)) {
            await fs.remove(file);
          }
        } catch (err) {
          console.error("Cleanup error:", err);
        }
      }
    }
  }
};
