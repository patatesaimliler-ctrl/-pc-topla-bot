const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
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
        .setDescription("Bütçen (TL)")
        .setRequired(true)
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
    console.error("Komut kayıt hatası:", error);
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "pc-topla") {
    const butce = interaction.options.getInteger("butce");

    await interaction.reply(
      `🖥️ **PC Toplama Botu**\n\n💰 Bütçe: **${butce.toLocaleString("tr-TR")} TL**\n\n🔧 Sistem hazırlanıyor...`
    );
  }
});

client.login(process.env.DISCORD_TOKEN);