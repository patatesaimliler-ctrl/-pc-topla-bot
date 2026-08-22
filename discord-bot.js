const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const { GoogleGenAI } = require("@google/genai");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const sessions = new Map();

/* =========================
   SLASH COMMAND
========================= */

const commands = [
  new SlashCommandBuilder()
    .setName("pctopla")
    .setDescription("Canlı fiyatlarla PC oluşturma arayüzünü açar.")
].map(command => command.toJSON());

const rest = new REST({ version: "10" })
  .setToken(process.env.DISCORD_TOKEN);

/* =========================
   YARDIMCI
========================= */

function money(number) {
  return `${Math.round(number).toLocaleString("tr-TR")} TL`;
}

function createSession(userId) {
  const session = {
    budget: null,
    game: null,
    package: "case",
    cpu: "AMD",
    gpu: "NVIDIA"
  };

  sessions.set(userId, session);
  return session;
}

/* =========================
   ANA MENÜ
========================= */

function mainMenu(session) {
  const budgetText = session.budget
    ? money(session.budget)
    : "Henüz seçilmedi";

  const gameText = session.game
    ? session.game
    : "Henüz seçilmedi";

  const packageText =
    session.package === "case"
      ? "🖥️ Sadece Kasa"
      : "🎒 Full Paket";

  return {
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🖥️ PC TOPLA")
        .setDescription(
          "🚀 **PC Builder**\n\n" +
          "Aşağıdaki butonlardan seçimlerini yap.\n" +
          "En sonunda **PC'Yİ OLUŞTUR** butonuna basınca Gemini güncel web fiyatlarını araştıracak.\n\n" +

          `💰 **Bütçe:** ${budgetText}\n` +
          `🎮 **Oyun:** ${gameText}\n` +
          `📦 **Paket:** ${packageText}\n` +
          `🧠 **CPU:** ${session.cpu}\n` +
          `🎮 **GPU:** ${session.gpu}`
        )
        .setFooter({
          text: "PC Builder • Gemini + canlı web fiyatları"
        })
    ],

    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("budget")
          .setLabel(`💰 ${budgetText}`)
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("package")
          .setLabel(
            session.package === "case"
              ? "🖥️ Sadece Kasa"
              : "🎒 Full Paket"
          )
          .setStyle(
            session.package === "case"
              ? ButtonStyle.Secondary
              : ButtonStyle.Success
          ),

        new ButtonBuilder()
          .setCustomId("cpu")
          .setLabel(`🧠 ${session.cpu}`)
          .setStyle(
            session.cpu === "AMD"
              ? ButtonStyle.Primary
              : ButtonStyle.Secondary
          )
      ),

      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("gpu")
          .setLabel(`🎮 ${session.gpu}`)
          .setStyle(
            session.gpu === "NVIDIA"
              ? ButtonStyle.Primary
              : ButtonStyle.Secondary
          )
      ),

      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("game")
          .setPlaceholder(
            session.game
              ? `🎮 ${session.game}`
              : "🎮 Oyun seç"
          )
          .addOptions([
            {
              label: "VALORANT",
              value: "VALORANT",
              emoji: "🎯"
            },
            {
              label: "Minecraft",
              value: "Minecraft",
              emoji: "⛏️"
            },
            {
              label: "Fortnite",
              value: "Fortnite",
              emoji: "🔫"
            },
            {
              label: "GTA V",
              value: "GTA V",
              emoji: "🚗"
            },
            {
              label: "FC",
              value: "EA Sports FC",
              emoji: "⚽"
            },
            {
              label: "RDR2",
              value: "Red Dead Redemption 2",
              emoji: "🐎"
            },
            {
              label: "Cyberpunk 2077",
              value: "Cyberpunk 2077",
              emoji: "🌆"
            }
          ])
      ),

      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("create")
          .setLabel("🚀 PC'Yİ OLUŞTUR")
          .setStyle(ButtonStyle.Success)
      )
    ]
  };
}

/* =========================
   GEMINI
========================= */

async function buildPC(session) {

  const prompt = `
Sen Türkiye'de PC toplama konusunda uzman bir bilgisayar danışmanısın.

KULLANICI SEÇİMLERİ:

Bütçe:
${session.budget} TL

Oyun:
${session.game}

CPU tercihi:
${session.cpu}

GPU tercihi:
${session.gpu}

Paket:
${session.package === "case"
    ? "SADECE KASA"
    : "FULL PAKET"}

ÇOK ÖNEMLİ KURALLAR:

1. TOPLAM FİYAT KESİNLİKLE ${session.budget} TL'Yİ GEÇMEYECEK.
2. Güncel Türkiye fiyatlarını Google Search kullanarak araştır.
3. Mümkün olduğunca gerçek ürün sayfalarındaki güncel fiyatları kullan.
4. Fiyatları TL olarak ver.
5. Stokta olmayan ürünleri tercih etme.
6. Aynı parçanın farklı mağazalardaki fiyatlarını karşılaştır.
7. En uygun mantıklı seçeneği kullan.
8. Kullanıcının seçtiği CPU markasına uy.
9. Kullanıcının seçtiği GPU markasına uy.
10. Seçilen oyunda iyi performans verecek sistem oluştur.
11. SADECE KASA seçildiyse monitör, klavye, mouse ve kulaklık EKLEME.
12. FULL PAKET seçildiyse kasa + monitör + klavye + mouse + kulaklık dahil et.
13. Gereksiz pahalı parçalar seçme.
14. Uyumsuz parçaları kesinlikle seçme.
15. Toplamı matematiksel olarak tekrar kontrol et.
16. Eğer bütçeye uygun sistem bulunamıyorsa daha ucuz parçalar seç.
17. Bütçeyi aşan sistem SUNMA.

120.000 TL üzerindeki sistemlerde hafif, eğlenceli bir yorum yapabilirsin.
Fakat kullanıcıyla dalga geçme veya fakirlik/maddi durum şakası yapma.

SADECE aşağıdaki JSON formatında cevap ver:

{
  "success": true,
  "total": 0,
  "remaining": 0,
  "comment": "",
  "parts": [
    {
      "category": "İşlemci",
      "name": "",
      "price": 0,
      "store": "",
      "url": ""
    }
  ]
}

Eğer bütçeye uygun sistem bulamazsan:

{
  "success": false,
  "reason": ""
}

JSON dışında hiçbir şey yazma.
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: prompt,
    config: {
      tools: [
        {
          googleSearch: {}
        }
      ]
    }
  });

  let text = response.text;

  text = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(text);
}

/* =========================
   BOT READY
========================= */

client.once("ready", async () => {

  console.log(`🤖 Bot aktif: ${client.user.tag}`);

  try {

    await rest.put(
      Routes.applicationCommands(client.user.id),
      {
        body: commands
      }
    );

    console.log("✅ /pctopla kaydedildi!");

  } catch (error) {

    console.error(
      "❌ Slash komut hatası:",
      error
    );

  }
});

/* =========================
   INTERACTIONS
========================= */

client.on("interactionCreate", async interaction => {

  try {

    /* =====================
       /PCTOPLA
    ===================== */

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "pctopla"
    ) {

      const session = createSession(
        interaction.user.id
      );

      await interaction.reply({
        ...mainMenu(session),
        ephemeral: false
      });

      return;
    }

    /* =====================
       BUTONLAR
    ===================== */

    if (interaction.isButton()) {

      const session =
        sessions.get(interaction.user.id);

      if (!session) {

        await interaction.reply({
          content:
            "❌ Oturumun süresi dolmuş. `/pctopla` ile yeniden başla.",
          ephemeral: true
        });

        return;
      }

      /* BÜTÇE */

      if (interaction.customId === "budget") {

        const modal =
          new ModalBuilder()
            .setCustomId("budgetModal")
            .setTitle("💰 Bütçe");

        const input =
          new TextInputBuilder()
            .setCustomId("budgetInput")
            .setLabel("Bütçeni TL olarak yaz")
            .setPlaceholder("Örn: 75000")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(4)
            .setMaxLength(7);

        modal.addComponents(
          new ActionRowBuilder()
            .addComponents(input)
        );

        await interaction.showModal(modal);

        return;
      }

      /* PAKET */

      if (interaction.customId === "package") {

        session.package =
          session.package === "case"
            ? "full"
            : "case";

        await interaction.update(
          mainMenu(session)
        );

        return;
      }

      /* CPU */

      if (interaction.customId === "cpu") {

        session.cpu =
          session.cpu === "AMD"
            ? "Intel"
            : "AMD";

        await interaction.update(
          mainMenu(session)
        );

        return;
      }

      /* GPU */

      if (interaction.customId === "gpu") {

        session.gpu =
          session.gpu === "NVIDIA"
            ? "AMD"
            : "NVIDIA";

        await interaction.update(
          mainMenu(session)
        );

        return;
      }

      /* OLUŞTUR */

      if (interaction.customId === "create") {

        if (!session.budget) {

          await interaction.reply({
            content:
              "❌ Önce **Bütçe** butonundan bütçeni gir.",
            ephemeral: true
          });

          return;
        }

        if (!session.game) {

          await interaction.reply({
            content:
              "❌ Önce bir **oyun** seç.",
            ephemeral: true
          });

          return;
        }

        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xf1c40f)
              .setTitle("🔎 PC ARAŞTIRILIYOR...")
              .setDescription(
                "🤖 Gemini güncel web fiyatlarını araştırıyor...\n\n" +
                "🛒 Mağazalar taranıyor\n" +
                "🧩 Parçalar karşılaştırılıyor\n" +
                "🧮 Bütçe kontrol ediliyor\n\n" +
                "⏳ Biraz bekle..."
              )
          ],
          components: []
        });

        const result =
          await buildPC(session);

        if (
          !result ||
          result.success !== true ||
          !Array.isArray(result.parts)
        ) {

          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle("❌ PC OLUŞTURULAMADI")
                .setDescription(
                  result?.reason ||
                  "Bu bütçeye uygun güvenilir bir sistem bulunamadı."
                )
                .setFooter({
                  text:
                    "PC Builder • Gemini canlı fiyat araması"
                })
            ],
            components: []
          });

          return;
        }

        /* KOD TARAFINDA BÜTÇE KONTROLÜ */

        const total = result.parts.reduce(
          (sum, part) =>
            sum + Number(part.price || 0),
          0
        );

        if (total > session.budget) {

          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle("🚨 BÜTÇE KONTROLÜ")
                .setDescription(
                  `Gemini'nin oluşturduğu sistem **${money(total)}** tuttu.\n\n` +
                  `💰 Maksimum bütçe: **${money(session.budget)}**\n` +
                  `❌ Sistem bütçeyi geçtiği için gönderilmedi.\n\n` +
                  "🔄 Daha uygun parçalarla tekrar deneyebilirsin."
                )
            ],
            components: []
          });

          return;
        }

        /* SONUÇ */

        const embed =
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("🚀 PC HAZIR!")
            .setDescription(
              `🎮 **Oyun:** ${session.game}\n` +
              `🧠 **CPU:** ${session.cpu}\n` +
              `🎮 **GPU:** ${session.gpu}\n` +
              `📦 **Paket:** ${
                session.package === "case"
                  ? "Sadece Kasa"
                  : "Full Paket"
              }\n\n` +
              `💰 **Toplam:** ${money(total)}\n` +
              `🟢 **Bütçede kalan:** ${money(
                session.budget - total
              )}\n\n` +
              `${result.comment || ""}`
            )
            .setFooter({
              text:
                "PC Builder • Gemini + Google Search"
            });

        for (const part of result.parts) {

          const price =
            Number(part.price || 0);

          embed.addFields({
            name:
              `🔹 ${part.category}`,
            value:
              `**${part.name}**\n` +
              `💵 ${money(price)}\n` +
              `🏪 ${part.store || "Mağaza bulunamadı"}\n` +
              (
                part.url
                  ? `🔗 [Ürünü görüntüle](${part.url})`
                  : "🔗 Ürün bağlantısı bulunamadı"
              ),
            inline: false
          });
        }

        await interaction.editReply({
          embeds: [embed],
          components: []
        });

        return;
      }
    }

    /* =====================
       OYUN SELECT
    ===================== */

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "game"
    ) {

      const session =
        sessions.get(interaction.user.id);

      if (!session) {

        await interaction.reply({
          content:
            "❌ Oturumun süresi dolmuş. `/pctopla` ile yeniden başla.",
          ephemeral: true
        });

        return;
      }

      session.game =
        interaction.values[0];

      await interaction.update(
        mainMenu(session)
      );

      return;
    }

    /* =====================
       BÜTÇE MODAL
    ===================== */

    if (
      interaction.isModalSubmit() &&
      interaction.customId === "budgetModal"
    ) {

      const session =
        sessions.get(interaction.user.id);

      if (!session) {

        await interaction.reply({
          content:
            "❌ Oturumun süresi dolmuş. `/pctopla` ile yeniden başla.",
          ephemeral: true
        });

        return;
      }

      const raw =
        interaction.fields
          .getTextInputValue("budgetInput")
          .replace(/\./g, "")
          .replace(/,/g, "")
          .replace(/\D/g, "");

      const budget =
        Number(raw);

      if (
        !Number.isFinite(budget) ||
        budget < 10000 ||
        budget > 500000
      ) {

        await interaction.reply({
          content:
            "❌ Bütçe **10.000 TL ile 500.000 TL** arasında olmalı.",
          ephemeral: true
        });

        return;
      }

      session.budget =
        budget;

      await interaction.reply({
        content:
          `✅ Bütçe **${money(budget)}** olarak seçildi.`,
        ephemeral: true
      });

      return;
    }

  } catch (error) {

    console.error(
      "❌ INTERACTION ERROR:",
      error
    );

    try {

      if (interaction.replied ||
          interaction.deferred) {

        await interaction.followUp({
          content:
            "❌ Bir hata oluştu. Railway Logs kısmındaki kırmızı hata satırına bak.",
          ephemeral: true
        });

      } else {

        await interaction.reply({
          content:
            "❌ Bir hata oluştu.",
          ephemeral: true
        });

      }

    } catch {}
  }

});

/* =========================
   LOGIN
========================= */

client.login(
  process.env.DISCORD_TOKEN
);