const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const commands = [
  new SlashCommandBuilder()
    .setName("pc-topla")
    .setDescription("Bütçene göre PC önerir.")
    .addIntegerOption(option =>
      option
        .setName("butce")
        .setDescription("Bütçen TL olarak")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("kullanim")
        .setDescription("PC kullanım amacı")
        .setRequired(true)
        .addChoices(
          { name: "Oyun", value: "oyun" },
          { name: "Yayın", value: "yayin" },
          { name: "İş", value: "is" }
        )
    )
    .addStringOption(option =>
      option
        .setName("cpu")
        .setDescription("İşlemci tercihi")
        .setRequired(true)
        .addChoices(
          { name: "AMD", value: "amd" },
          { name: "Intel", value: "intel" }
        )
    )
    .addStringOption(option =>
      option
        .setName("gpu")
        .setDescription("Ekran kartı tercihi")
        .setRequired(true)
        .addChoices(
          { name: "NVIDIA", value: "nvidia" },
          { name: "AMD", value: "amd" }
        )
    )
].map(command => command.toJSON());

const rest = new REST({ version: "10" })
  .setToken(process.env.DISCORD_TOKEN);

client.once("ready", async () => {
  console.log(`Bot aktif: ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );

    console.log("Slash komutları kaydedildi!");
  } catch (error) {
    console.error(error);
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "pc-topla") return;

  const butce = interaction.options.getInteger("butce");
  const kullanim = interaction.options.getString("kullanim");
  const cpu = interaction.options.getString("cpu");
  const gpu = interaction.options.getString("gpu");

  let sistem;

  if (butce < 30000) {
    sistem = {
      cpu: cpu === "amd" ? "Ryzen 5 5500" : "Intel Core i3-12100F",
      gpu: gpu === "nvidia" ? "RTX 3050" : "RX 6600",
      ram: "16 GB DDR4",
      ssd: "500 GB NVMe SSD",
      anakart: "B550 / B660",
      psu: "550W 80+ Bronze",
      kasa: "Hava akışlı ATX kasa"
    };
  } else if (butce < 60000) {
    sistem = {
      cpu: cpu === "amd" ? "Ryzen 5 7500F" : "Intel Core i5-14400F",
      gpu: gpu === "nvidia" ? "RTX 4060 Ti" : "RX 7700 XT",
      ram: "32 GB DDR5",
      ssd: "1 TB NVMe SSD",
      anakart: "B650 / B760",
      psu: "650W 80+ Bronze",
      kasa: "Mesh ön panelli ATX kasa"
    };
  } else if (butce < 100000) {
    sistem = {
      cpu: cpu === "amd" ? "Ryzen 7 7800X3D" : "Intel Core i7-14700F",
      gpu: gpu === "nvidia" ? "RTX 4070 SUPER" : "RX 7900 GRE",
      ram: "32 GB DDR5",
      ssd: "1 TB NVMe SSD",
      anakart: "B650 / B760",
      psu: "750W 80+ Gold",
      kasa: "Yüksek hava akışlı ATX kasa"
    };
  } else {
    sistem = {
      cpu: cpu === "amd" ? "Ryzen 7 9800X3D" : "Intel Core Ultra 7",
      gpu: gpu === "nvidia" ? "RTX 5080" : "RX 9070 XT",
      ram: "32 GB DDR5",
      ssd: "2 TB NVMe SSD",
      anakart: "B850 / Z890",
      psu: "850W 80+ Gold",
      kasa: "Premium airflow ATX kasa"
    };
  }

  const embed = new EmbedBuilder()
    .setTitle("🖥️ PC Toplama Botu")
    .setDescription(
      `💰 **Bütçe:** ${butce.toLocaleString("tr-TR")} TL\n` +
      `🎯 **Kullanım:** ${kullanim}\n` +
      `🧠 **CPU:** ${cpu.toUpperCase()}\n` +
      `🎮 **GPU:** ${gpu.toUpperCase()}`
    )
    .addFields(
      { name: "🧠 İşlemci", value: sistem.cpu, inline: true },
      { name: "🎮 Ekran Kartı", value: sistem.gpu, inline: true },
      { name: "🧩 RAM", value: sistem.ram, inline: true },
      { name: "💾 SSD", value: sistem.ssd, inline: true },
      { name: "🔧 Anakart", value: sistem.anakart, inline: true },
      { name: "⚡ PSU", value: sistem.psu, inline: true },
      { name: "📦 Kasa", value: sistem.kasa, inline: false }
    )
    .setFooter({ text: "PC Builder Bot" });

  await interaction.reply({ embeds: [embed] });
});

client.login(process.env.DISCORD_TOKEN);