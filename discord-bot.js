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

/* =========================================================
   AYARLAR
========================================================= */

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN bulunamadı!");
}

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY bulunamadı!");
}

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* =========================================================
   KOMUT
========================================================= */

const commands = [
  new SlashCommandBuilder()
    .setName("pctopla")
    .setDescription("Gemini ile canlı fiyatlarla PC oluştur.")
].map(command => command.toJSON());

const rest = new REST({
  version: "10"
}).setToken(DISCORD_TOKEN);

/* =========================================================
   OTURUMLAR
========================================================= */

const sessions = new Map();

function createSession(userId) {
  const session = {
    userId,
    budget: null,
    game: null,
    cpu: "amd",
    gpu: "nvidia",
    createdAt: Date.now()
  };

  sessions.set(userId, session);

  return session;
}

function getSession(userId) {
  const session = sessions.get(userId);

  if (!session) {
    return null;
  }

  // 20 dakika
  if (Date.now() - session.createdAt > 20 * 60 * 1000) {
    sessions.delete(userId);
    return null;
  }

  session.createdAt = Date.now();

  return session;
}

/* =========================================================
   PARA
========================================================= */

function money(number) {
  return `${Math.round(number).toLocaleString("tr-TR")} TL`;
}

/* =========================================================
   ANA EMBED
========================================================= */

function createBuilderEmbed(session) {

  const budget =
    session.budget
      ? money(session.budget)
      : "Henüz seçilmedi";

  const game =
    session.game
      ? session.game
      : "Henüz seçilmedi";

  const cpu =
    session.cpu === "amd"
      ? "AMD"
      : "Intel";

  const gpu =
    session.gpu === "nvidia"
      ? "NVIDIA"
      : "AMD";

  return new EmbedBuilder()
    .setTitle("🖥️ PC TOPLA")
    .setDescription(
      "🤖 **Gemini PC Builder**\n\n" +

      "Aşağıdaki butonlardan seçimlerini yap.\n" +
      "⚠️ Butonlara basmak sistemi oluşturmaz.\n" +
      "Sadece seçimini değiştirir.\n\n" +

      `💰 **Bütçe:** ${budget}\n` +
      `🎮 **Oyun:** ${game}\n` +
      `🧠 **CPU:** ${cpu}\n` +
      `🎮 **GPU:** ${gpu}\n` +
      `📦 **Paket:** 🖥️ Sadece Kasa\n\n` +

      "🚀 Her şey hazır olduğunda **PC'Yİ OLUŞTUR** butonuna bas."
    )
    .setFooter({
      text: "Gemini PC Builder • Canlı web fiyat araştırması"
    });
}

/* =========================================================
   ANA BUTONLAR
========================================================= */

function createMainButtons(session) {

  const budgetButton =
    new ButtonBuilder()
      .setCustomId("budget")
      .setLabel(
        session.budget
          ? `💰 ${money(session.budget)}`
          : "💰 Bütçe"
      )
      .setStyle(
        session.budget
          ? ButtonStyle.Success
          : ButtonStyle.Primary
      );

  const gameButton =
    new ButtonBuilder()
      .setCustomId("game")
      .setLabel(
        session.game
          ? `🎮 ${session.game}`
          : "🎮 Oyun"
      )
      .setStyle(
        session.game
          ? ButtonStyle.Success
          : ButtonStyle.Secondary
      );

  const cpuButton =
    new ButtonBuilder()
      .setCustomId("cpu")
      .setLabel(
        session.cpu === "amd"
          ? "🧠 AMD"
          : "🧠 Intel"
      )
      .setStyle(ButtonStyle.Secondary);

  const gpuButton =
    new ButtonBuilder()
      .setCustomId("gpu")
      .setLabel(
        session.gpu === "nvidia"
          ? "🎮 NVIDIA"
          : "🎮 AMD GPU"
      )
      .setStyle(ButtonStyle.Secondary);

  const createButton =
    new ButtonBuilder()
      .setCustomId("create_pc")
      .setLabel("🚀 PC'Yİ OLUŞTUR")
      .setStyle(ButtonStyle.Success);

  return [

    new ActionRowBuilder().addComponents(
      budgetButton,
      gameButton,
      cpuButton
    ),

    new ActionRowBuilder().addComponents(
      gpuButton,
      createButton
    )

  ];
}

/* =========================================================
   OYUN SEÇİMİ
========================================================= */

function createGameMenu() {

  return new ActionRowBuilder().addComponents(

    new StringSelectMenuBuilder()
      .setCustomId("game_select")
      .setPlaceholder("🎮 Oyun seç")

      .addOptions(
        {
          label: "VALORANT",
          value: "VALORANT",
          emoji: "🎯"
        },

        {
          label: "Fortnite",
          value: "Fortnite",
          emoji: "🔫"
        },

        {
          label: "Minecraft",
          value: "Minecraft",
          emoji: "⛏️"
        },

        {
          label: "GTA V",
          value: "GTA V",
          emoji: "🚗"
        },

        {
          label: "Red Dead Redemption 2",
          value: "Red Dead Redemption 2",
          emoji: "🤠"
        },

        {
          label: "EA SPORTS FC",
          value: "EA SPORTS FC",
          emoji: "⚽"
        }
      )
  );
}

/* =========================================================
   CPU SEÇİMİ
========================================================= */

function createCpuMenu() {

  return new ActionRowBuilder().addComponents(

    new StringSelectMenuBuilder()
      .setCustomId("cpu_select")
      .setPlaceholder("🧠 CPU seç")

      .addOptions(
        {
          label: "AMD",
          value: "amd",
          emoji: "🧠"
        },

        {
          label: "Intel",
          value: "intel",
          emoji: "🧠"
        }
      )
  );
}

/* =========================================================
   GPU SEÇİMİ
========================================================= */

function createGpuMenu() {

  return new ActionRowBuilder().addComponents(

    new StringSelectMenuBuilder()
      .setCustomId("gpu_select")
      .setPlaceholder("🎮 GPU seç")

      .addOptions(
        {
          label: "NVIDIA",
          value: "nvidia",
          emoji: "🎮"
        },

        {
          label: "AMD",
          value: "amd",
          emoji: "🎮"
        }
      )
  );
}

/* =========================================================
   BÜTÇE MODAL
========================================================= */

function createBudgetModal() {

  const modal =
    new ModalBuilder()
      .setCustomId("budget_modal")
      .setTitle("💰 PC Bütçesi");

  const input =
    new TextInputBuilder()
      .setCustomId("budget_input")
      .setLabel("Bütçen kaç TL?")
      .setPlaceholder("Örnek: 75000")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(4)
      .setMaxLength(7);

  modal.addComponents(
    new ActionRowBuilder().addComponents(input)
  );

  return modal;
}

/* =========================================================
   GEMINI
========================================================= */

async function askGemini(session) {

  const prompt = `
Sen Türkiye'de PC toplama konusunda uzman bir alışveriş asistanısın.

KULLANICI BİLGİLERİ:

Bütçe:
${session.budget} TL

Oyun:
${session.game}

CPU tercihi:
${session.cpu === "amd" ? "AMD" : "Intel"}

GPU tercihi:
${session.gpu === "nvidia" ? "NVIDIA" : "AMD"}

PAKET:
Sadece kasa.

ÇOK ÖNEMLİ KURALLAR:

1. TOPLAM FİYAT KESİNLİKLE ${session.budget} TL'Yİ GEÇMEYECEK.

2. Güncel Türkiye fiyatlarını Google Search kullanarak araştır.

3. Mümkün olduğunca gerçek satış sayfalarını bul.

4. Fiyatı açıkça görünen ürünleri tercih et.

5. Stokta olmayan veya fiyatı belirsiz ürünleri kullanma.

6. CPU ve anakart soket uyumluluğunu kontrol et.

7. RAM anakartla uyumlu olmalı.

8. PSU sistem için yeterli olmalı.

9. GPU seçilen GPU markasına uygun olmalı.

10. Seçilen oyun için dengeli sistem oluştur.

11. Sadece kasa parçaları:
- CPU
- GPU
- RAM
- SSD
- Anakart
- PSU
- Kasa

12. Monitör, klavye, mouse, kulaklık vb. EKLEME.

13. Hazır sistem alma. Tek tek parçalar bul.

14. Aynı ürün için mümkünse daha ucuz güvenilir seçeneği tercih et.

15. Toplamı matematiksel olarak tekrar kontrol et.

16. Eğer bütçeye sığmıyorsa daha ucuz parçalar seç.

17. Bütçeyi geçiyorsa ASLA sonuç verme.

18. Wraith veya özel Wraith paketleri kullanma.

19. 120.000 TL üzerindeyse hafif mizahi bir cümle kullanabilirsin.
Fakat kullanıcıyla dalga geçme.

WEB ARAŞTIRMASI:

Türkiye'deki güncel fiyatları araştır.
Akakçe, Hepsiburada, Trendyol, Teknosa, Vatan, İtopya,
Sinerji, İncehesap ve benzeri güvenilir mağazaları kontrol edebilirsin.

SONUCU SADECE GEÇERLİ JSON OLARAK DÖNDÜR.

ŞU ŞEMAYI KULLAN:

{
  "success": true,
  "total_price": 0,
  "remaining_budget": 0,
  "comment": "",
  "parts": [
    {
      "type": "CPU",
      "name": "",
      "price": 0,
      "url": "",
      "store": ""
    },
    {
      "type": "GPU",
      "name": "",
      "price": 0,
      "url": "",
      "store": ""
    },
    {
      "type": "RAM",
      "name": "",
      "price": 0,
      "url": "",
      "store": ""
    },
    {
      "type": "SSD",
      "name": "",
      "price": 0,
      "url": "",
      "store": ""
    },
    {
      "type": "MOTHERBOARD",
      "name": "",
      "price": 0,
      "url": "",
      "store": ""
    },
    {
      "type": "PSU",
      "name": "",
      "price": 0,
      "url": "",
      "store": ""
    },
    {
      "type": "CASE",
      "name": "",
      "price": 0,
      "url": "",
      "store": ""
    }
  ]
}

Eğer bütçeye uygun güvenilir bir sistem bulamazsan:

{
  "success": false,
  "total_price": 0,
  "remaining_budget": ${session.budget},
  "comment": "Neden uygun sistem bulunamadığını açıkla.",
  "parts": []
}

Fiyatları TL olarak sayı şeklinde yaz.
Örneğin 24999.90 değil 24999 yazabilirsin.

TOPLAM FİYAT:
parts içindeki fiyatların toplamı olmalı.

BÜTÇE:
${session.budget} TL.

KESİNLİKLE AŞMA.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.7-flash",

    contents: prompt,

    config: {
      tools: [
        {
          googleSearch: {}
        }
      ],

      responseMimeType: "application/json"
    }
  });

  const text = response.text;

  if (!text) {
    throw new Error("Gemini boş cevap verdi.");
  }

  return cleanJson(text);
}

/* =========================================================
   JSON TEMİZLE
========================================================= */

function cleanJson(text) {

  let cleaned = text.trim();

  // ```json ... ``` gelirse temizle
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {

    return JSON.parse(cleaned);

  } catch (error) {

    console.error(
      "Gemini JSON hatası:",
      cleaned
    );

    throw new Error(
      "Gemini geçerli JSON döndürmedi."
    );
  }
}

/* =========================================================
   BÜTÇE SON KONTROL
========================================================= */

function validateBuild(data, budget) {

  if (!data || !data.success) {
    return {
      valid: false,
      reason:
        data?.comment ||
        "Uygun sistem bulunamadı."
    };
  }

  if (!Array.isArray(data.parts)) {
    return {
      valid: false,
      reason: "Parça listesi alınamadı."
    };
  }

  const required = [
    "CPU",
    "GPU",
    "RAM",
    "SSD",
    "MOTHERBOARD",
    "PSU",
    "CASE"
  ];

  for (const type of required) {

    if (!data.parts.some(p => p.type === type)) {

      return {
        valid: false,
        reason:
          `${type} parçası eksik.`
      };
    }
  }

  let calculatedTotal = 0;

  for (const part of data.parts) {

    const price = Number(part.price);

    if (!Number.isFinite(price) || price <= 0) {

      return {
        valid: false,
        reason:
          `${part.type} için geçerli fiyat bulunamadı.`
      };
    }

    calculatedTotal += price;
  }

  calculatedTotal =
    Math.round(calculatedTotal);

  /*
    EN ÖNEMLİ KISIM
  */

  if (calculatedTotal > budget) {

    return {
      valid: false,
      reason:
        `Gemini'nin seçtiği sistem ${money(calculatedTotal)} tuttu ve bütçeyi aşıyor. Sistem gönderilmedi.`
    };
  }

  return {
    valid: true,
    total: calculatedTotal,
    remaining: budget - calculatedTotal,
    parts: data.parts
  };
}

/* =========================================================
   SONUÇ EMBED
========================================================= */

function createResultEmbed(session, build) {

  const embed =
    new EmbedBuilder()
      .setTitle("🚀 PC HAZIR!")
      .setDescription(
        `🎮 **Oyun:** ${session.game}\n` +
        `💰 **Bütçe:** ${money(session.budget)}\n` +
        `💵 **Toplam:** ${money(build.total)}\n` +
        `🟢 **Kalan:** ${money(build.remaining)}\n\n` +

        "✅ Sistem bütçeyi aşmadı.\n" +
        "🤖 Fiyatlar Gemini'nin canlı web araştırmasıyla bulundu."
      );

  for (const part of build.parts) {

    let emoji = "📦";

    if (part.type === "CPU") emoji = "🧠";
    if (part.type === "GPU") emoji = "🎮";
    if (part.type === "RAM") emoji = "🧩";
    if (part.type === "SSD") emoji = "💾";
    if (part.type === "MOTHERBOARD") emoji = "🔧";
    if (part.type === "PSU") emoji = "⚡";
    if (part.type === "CASE") emoji = "📦";

    let value =
      `**${part.name}**\n` +
      `💰 ${money(part.price)}\n`;

    if (part.store) {
      value += `🏪 ${part.store}\n`;
    }

    if (
      part.url &&
      typeof part.url === "string" &&
      part.url.startsWith("http")
    ) {
      value += `🔗 [Ürüne git](${part.url})`;
    }

    embed.addFields({
      name: `${emoji} ${part.type}`,
      value,
      inline: false
    });
  }

  if (session.budget >= 120000) {

    embed.addFields({
      name: "💀 Bütçe seviyesi",
      value:
        "120K+ bütçe açıldı. Ekran kartı artık sistemin patronu.",
      inline: false
    });
  }

  embed.setFooter({
    text:
      "Gemini PC Builder • Canlı web araştırması"
  });

  return embed;
}

/* =========================================================
   READY
========================================================= */

client.once("ready", async () => {

  console.log(
    `🤖 Bot aktif: ${client.user.tag}`
  );

  try {

    await rest.put(
      Routes.applicationCommands(client.user.id),
      {
        body: commands
      }
    );

    console.log(
      "✅ /pctopla kaydedildi!"
    );

  } catch (error) {

    console.error(
      "❌ Slash komut hatası:",
      error
    );
  }
});

/* =========================================================
   INTERACTION
========================================================= */

client.on(
  "interactionCreate",
  async interaction => {

    try {

      /* =====================================================
         /pctopla
      ===================================================== */

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName === "pctopla"
      ) {

        const session =
          createSession(
            interaction.user.id
          );

        await interaction.reply({

          embeds: [
            createBuilderEmbed(session)
          ],

          components:
            createMainButtons(session)

        });

        return;
      }

      /* =====================================================
         BUTTON
      ===================================================== */

      if (interaction.isButton()) {

        const session =
          getSession(
            interaction.user.id
          );

        if (!session) {

          return interaction.reply({
            content:
              "❌ Oturumun süresi dolmuş. `/pctopla` ile yeniden başla.",
            ephemeral: true
          });
        }

        /* BÜTÇE */

        if (
          interaction.customId ===
          "budget"
        ) {

          await interaction.showModal(
            createBudgetModal()
          );

          return;
        }

        /* OYUN */

        if (
          interaction.customId ===
          "game"
        ) {

          await interaction.reply({
            content:
              "🎮 Oyununu seç:",
            components: [
              createGameMenu()
            ],
            ephemeral: true
          });

          return;
        }

        /* CPU */

        if (
          interaction.customId ===
          "cpu"
        ) {

          await interaction.reply({
            content:
              "🧠 İşlemci tercihini seç:",
            components: [
              createCpuMenu()
            ],
            ephemeral: true
          });

          return;
        }

        /* GPU */

        if (
          interaction.customId ===
          "gpu"
        ) {

          await interaction.reply({
            content:
              "🎮 Ekran kartı tercihini seç:",
            components: [
              createGpuMenu()
            ],
            ephemeral: true
          });

          return;
        }

        /* =================================================
           OLUŞTUR
        ================================================= */

        if (
          interaction.customId ===
          "create_pc"
        ) {

          if (!session.budget) {

            return interaction.reply({
              content:
                "❌ Önce 💰 **Bütçe** seç.",
              ephemeral: true
            });
          }

          if (!session.game) {

            return interaction.reply({
              content:
                "❌ Önce 🎮 **Oyun** seç.",
              ephemeral: true
            });
          }

          await interaction.deferUpdate();

          await interaction.editReply({

            embeds: [

              new EmbedBuilder()
                .setTitle(
                  "🔎 GEMINI ARAŞTIRIYOR..."
                )
                .setDescription(
                  "🌐 Güncel web fiyatlarını araştırıyorum...\n\n" +

                  `💰 Bütçe: **${money(session.budget)}**\n` +
                  `🎮 Oyun: **${session.game}**\n\n` +

                  "🧠 Parçaları karşılaştırıyorum.\n" +
                  "🔧 Uyumluluğu kontrol ediyorum.\n" +
                  "💸 Bütçeyi aşan sistemleri eliyorum.\n\n" +

                  "⏳ Biraz sürebilir..."
                )

            ],

            components: []
          });

          let rawResult;

          try {

            rawResult =
              await askGemini(session);

          } catch (error) {

            console.error(
              "GEMINI ERROR:",
              error
            );

            await interaction.editReply({

              embeds: [

                new EmbedBuilder()
                  .setTitle(
                    "❌ GEMINI HATASI"
                  )
                  .setDescription(
                    "Gemini'den cevap alınamadı.\n\n" +
                    "API anahtarını ve Railway loglarını kontrol et."
                  )

              ],

              components:
                createMainButtons(session)

            });

            return;
          }

          const checked =
            validateBuild(
              rawResult,
              session.budget
            );

          /* BÜTÇEYİ AŞTI */

          if (!checked.valid) {

            await interaction.editReply({

              embeds: [

                new EmbedBuilder()
                  .setTitle(
                    "❌ PC OLUŞTURULAMADI"
                  )
                  .setDescription(
                    `🚫 **Bütçe güvenliği sistemi sistemi durdurdu.**\n\n` +
                    `${checked.reason}\n\n` +
                    "💡 Gemini yeniden araştırabilir. " +
                    "Bütçeyi artırmak zorunda değilsin."
                  )
                  .setFooter({
                    text:
                      "PC Builder • Bütçe kilidi aktif"
                  })

              ],

              components:
                createMainButtons(session)

            });

            return;
          }

          /* =================================================
             BAŞARILI
          ================================================= */

          await interaction.editReply({

            embeds: [
              createResultEmbed(
                session,
                checked
              )
            ],

            components:
              createMainButtons(session)

          });

          return;
        }
      }

      /* =====================================================
         MODAL
      ===================================================== */

      if (
        interaction.isModalSubmit() &&
        interaction.customId ===
          "budget_modal"
      ) {

        const session =
          getSession(
            interaction.user.id
          );

        if (!session) {

          return interaction.reply({
            content:
              "❌ Oturum bulunamadı. `/pctopla` ile yeniden başla.",
            ephemeral: true
          });
        }

        const raw =
          interaction.fields.getTextInputValue(
            "budget_input"
          );

        const cleaned =
          raw
            .replace(/\./g, "")
            .replace(/,/g, "")
            .replace(/\s/g, "");

        const budget =
          Number(cleaned);

        if (
          !Number.isFinite(budget) ||
          budget < 10000 ||
          budget > 500000
        ) {

          return interaction.reply({
            content:
              "❌ Bütçe 10.000 TL ile 500.000 TL arasında olmalı.",
            ephemeral: true
          });
        }

        session.budget =
          Math.floor(budget);

        session.createdAt =
          Date.now();

        await interaction.reply({
          content:
            `💰 Bütçe **${money(session.budget)}** olarak seçildi.`,
          ephemeral: true
        });

        return;
      }

      /* =====================================================
         SELECT MENÜ
      ===================================================== */

      if (
        interaction.isStringSelectMenu()
      ) {

        const session =
          getSession(
            interaction.user.id
          );

        if (!session) {

          return interaction.reply({
            content:
              "❌ Oturum bulunamadı. `/pctopla` ile yeniden başla.",
            ephemeral: true
          });
        }

        /* OYUN */

        if (
          interaction.customId ===
          "game_select"
        ) {

          session.game =
            interaction.values[0];

          await interaction.update({
            content:
              `🎮 Oyun seçildi: **${session.game}**`,
            components: []
          });

          return;
        }

        /* CPU */

        if (
          interaction.customId ===
          "cpu_select"
        ) {

          session.cpu =
            interaction.values[0];

          await interaction.update({
            content:
              `🧠 CPU seçildi: **${
                session.cpu === "amd"
                  ? "AMD"
                  : "Intel"
              }**`,
            components: []
          });

          return;
        }

        /* GPU */

        if (
          interaction.customId ===
          "gpu_select"
        ) {

          session.gpu =
            interaction.values[0];

          await interaction.update({
            content:
              `🎮 GPU seçildi: **${
                session.gpu === "nvidia"
                  ? "NVIDIA"
                  : "AMD"
              }**`,
            components: []
          });

          return;
        }
      }

    } catch (error) {

      console.error(
        "INTERACTION ERROR:",
        error
      );

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {

        await interaction.reply({
          content:
            "❌ Beklenmeyen bir hata oluştu.",
          ephemeral: true
        });
      }
    }
  }
);

/* =========================================================
   LOGIN
========================================================= */

client.login(DISCORD_TOKEN);