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

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.DISCORD_TOKEN;
const REEF_KEY = process.env.REEF_KEY;

if (!TOKEN) throw new Error("DISCORD_TOKEN eksik!");
if (!REEF_KEY) throw new Error("REEF_KEY eksik!");

/* =========================================================
   SLASH COMMAND
========================================================= */

const commands = [
  new SlashCommandBuilder()
    .setName("pctopla")
    .setDescription("Canlı fiyatlarla bütçene uygun PC oluşturur.")
].map(x => x.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

/* =========================================================
   OTURUM
========================================================= */

const sessions = new Map();

function newSession(userId) {
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

/* =========================================================
   PARA
========================================================= */

function money(value) {
  return `${Math.round(value).toLocaleString("tr-TR")} TL`;
}

/* =========================================================
   REEF API - CANLI AKAKÇE
========================================================= */

async function priceSearch(query, maxBudget = null) {
  const body = {
    query,
    page: 1,
    max_pages: 1,
    sort: "price_asc",
    source: "akakce"
  };

  if (maxBudget) {
    body.price = `1-${Math.floor(maxBudget)}`;
  }

  const response = await fetch(
    "https://api.reefapi.com/price-compare/v1/search",
    {
      method: "POST",
      headers: {
        "x-api-key": REEF_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ReefAPI ${response.status}: ${text}`);
  }

  const json = await response.json();

  if (!json.ok) {
    throw new Error(
      json.error?.message ||
      json.error ||
      "ReefAPI hata döndürdü."
    );
  }

  const results =
    json?.data?.results ||
    json?.data ||
    [];

  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .filter(p =>
      p &&
      typeof p.lowest_price === "number" &&
      p.lowest_price > 0
    )
    .sort((a, b) => a.lowest_price - b.lowest_price);
}

/* =========================================================
   ÜRÜN BUL
========================================================= */

async function findProduct(queries, maxBudget) {

  for (const query of queries) {

    try {

      const results = await priceSearch(query, maxBudget);

      if (results.length > 0) {

        const product = results.find(
          x =>
            typeof x.lowest_price === "number" &&
            x.lowest_price <= maxBudget
        );

        if (product) {
          return product;
        }
      }

    } catch (error) {
      console.error(`Arama hatası (${query}):`, error.message);
    }
  }

  return null;
}

/* =========================================================
   OYUNA GÖRE PARÇA PROFİLİ
========================================================= */

function getGameProfile(game, cpu, gpu) {

  const profiles = {

    valorant: {
      cpu:
        cpu === "amd"
          ? ["Ryzen 5 7500F", "Ryzen 5 7600", "Ryzen 5 5600"]
          : ["Core i5-14400F", "Core i5-12400F"],

      gpu:
        gpu === "nvidia"
          ? ["RTX 4060", "RTX 3060", "RTX 3050"]
          : ["RX 7600", "RX 6650 XT", "RX 6600"]
    },

    fortnite: {
      cpu:
        cpu === "amd"
          ? ["Ryzen 5 7500F", "Ryzen 5 7600"]
          : ["Core i5-14400F", "Core i5-13400F"],

      gpu:
        gpu === "nvidia"
          ? ["RTX 4060", "RTX 4060 Ti", "RTX 5060"]
          : ["RX 7600", "RX 7700 XT"]
    },

    minecraft: {
      cpu:
        cpu === "amd"
          ? ["Ryzen 5 7500F", "Ryzen 5 7600", "Ryzen 7 7800X3D"]
          : ["Core i5-14400F", "Core i7-14700F"],

      gpu:
        gpu === "nvidia"
          ? ["RTX 4060", "RTX 4060 Ti", "RTX 4070"]
          : ["RX 7600", "RX 7700 XT"]
    },

    gta: {
      cpu:
        cpu === "amd"
          ? ["Ryzen 5 7500F", "Ryzen 5 7600", "Ryzen 7 7800X3D"]
          : ["Core i5-14400F", "Core i7-14700F"],

      gpu:
        gpu === "nvidia"
          ? ["RTX 4060", "RTX 4070 SUPER", "RTX 5070"]
          : ["RX 7700 XT", "RX 7800 XT", "RX 9070"]
    },

    rdr2: {
      cpu:
        cpu === "amd"
          ? ["Ryzen 5 7500F", "Ryzen 5 7600", "Ryzen 7 7800X3D"]
          : ["Core i5-14400F", "Core i7-14700F"],

      gpu:
        gpu === "nvidia"
          ? ["RTX 4060 Ti", "RTX 4070 SUPER", "RTX 5070"]
          : ["RX 7700 XT", "RX 7800 XT", "RX 9070"]
    },

    fc: {
      cpu:
        cpu === "amd"
          ? ["Ryzen 5 7500F", "Ryzen 5 7600"]
          : ["Core i5-14400F", "Core i5-14400F"],

      gpu:
        gpu === "nvidia"
          ? ["RTX 4060", "RTX 4060 Ti"]
          : ["RX 7600", "RX 7700 XT"]
    }
  };

  return profiles[game] || profiles.valorant;
}

/* =========================================================
   RAM / SSD / ANAKART / PSU / KASA
========================================================= */

function getOtherQueries(session) {

  const ddr = session.cpu === "amd"
    ? ["32GB DDR5 6000", "32GB DDR5 RAM"]
    : ["32GB DDR5 RAM", "16GB DDR5 RAM"];

  return {

    ram: ddr,

    ssd: [
      "1TB NVMe SSD",
      "1TB M.2 SSD",
      "1000GB NVMe SSD"
    ],

    motherboard:
      session.cpu === "amd"
        ? ["B650 anakart", "B650M anakart"]
        : ["B760 anakart", "B760M anakart"],

    psu: [
      "650W 80 Plus Bronze PSU",
      "750W 80 Plus Gold PSU",
      "650W 80 Plus Gold PSU"
    ],

    case: [
      "Mesh ATX Gaming Kasa",
      "Airflow ATX Gaming Kasa",
      "Gaming Kasa Mesh"
    ]
  };
}

/* =========================================================
   BUTONLAR
========================================================= */

function mainButtons(session) {

  const budgetText = session.budget
    ? `💰 ${money(session.budget)}`
    : "💰 Bütçe";

  const gameText = session.game
    ? `🎮 ${session.game.toUpperCase()}`
    : "🎮 Oyun";

  const cpuText =
    session.cpu === "amd"
      ? "🧠 AMD"
      : "🧠 Intel";

  const gpuText =
    session.gpu === "nvidia"
      ? "🎮 NVIDIA"
      : "🎮 AMD GPU";

  return [
    new ActionRowBuilder().addComponents(

      new ButtonBuilder()
        .setCustomId("budget")
        .setLabel(budgetText)
        .setStyle(
          session.budget
            ? ButtonStyle.Success
            : ButtonStyle.Primary
        ),

      new ButtonBuilder()
        .setCustomId("game")
        .setLabel(gameText)
        .setStyle(
          session.game
            ? ButtonStyle.Success
            : ButtonStyle.Secondary
        ),

      new ButtonBuilder()
        .setCustomId("cpu")
        .setLabel(cpuText)
        .setStyle(ButtonStyle.Secondary)

    ),

    new ActionRowBuilder().addComponents(

      new ButtonBuilder()
        .setCustomId("gpu")
        .setLabel(gpuText)
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("create")
        .setLabel("🚀 PC'Yİ OLUŞTUR")
        .setStyle(ButtonStyle.Success)
    )
  ];
}

/* =========================================================
   EMBED
========================================================= */

function builderEmbed(session) {

  const complete =
    session.budget &&
    session.game;

  return new EmbedBuilder()
    .setTitle("🖥️ PC TOPLA")
    .setDescription(
      "🚀 **PC Builder**\n\n" +
      "Aşağıdaki butonlardan seçimlerini yap.\n" +
      "Butonlara basmak **PC'yi oluşturmaz**, sadece seçimini değiştirir.\n\n" +

      `💰 **Bütçe:** ${
        session.budget
          ? money(session.budget)
          : "Henüz seçilmedi"
      }\n` +

      `🎮 **Oyun:** ${
        session.game
          ? session.game.toUpperCase()
          : "Henüz seçilmedi"
      }\n` +

      `📦 **Paket:** 🖥️ Sadece Kasa\n` +

      `🧠 **CPU:** ${
        session.cpu === "amd"
          ? "AMD"
          : "Intel"
      }\n` +

      `🎮 **GPU:** ${
        session.gpu === "nvidia"
          ? "NVIDIA"
          : "AMD"
      }\n\n` +

      (
        complete
          ? "🟢 Seçimler hazır. **PC'Yİ OLUŞTUR** butonuna bas."
          : "🟡 Önce bütçeni ve oyunu seç."
      )
    )
    .setFooter({
      text: "PC Builder • Canlı Akakçe fiyatları"
    });
}

/* =========================================================
   OYUN MENÜSÜ
========================================================= */

function gameMenu() {

  return new ActionRowBuilder().addComponents(

    new StringSelectMenuBuilder()
      .setCustomId("game_select")
      .setPlaceholder("🎮 Oyununu seç")
      .addOptions(

        {
          label: "VALORANT",
          value: "valorant",
          emoji: "🎯"
        },

        {
          label: "Fortnite",
          value: "fortnite",
          emoji: "🔫"
        },

        {
          label: "Minecraft",
          value: "minecraft",
          emoji: "⛏️"
        },

        {
          label: "GTA",
          value: "gta",
          emoji: "🚗"
        },

        {
          label: "Red Dead Redemption 2",
          value: "rdr2",
          emoji: "🤠"
        },

        {
          label: "EA SPORTS FC",
          value: "fc",
          emoji: "⚽"
        }

      )

  );
}

/* =========================================================
   CPU / GPU MENÜ
========================================================= */

function cpuMenu() {

  return new ActionRowBuilder().addComponents(

    new StringSelectMenuBuilder()
      .setCustomId("cpu_select")
      .setPlaceholder("🧠 İşlemci seç")
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

function gpuMenu() {

  return new ActionRowBuilder().addComponents(

    new StringSelectMenuBuilder()
      .setCustomId("gpu_select")
      .setPlaceholder("🎮 Ekran kartı seç")
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

function budgetModal() {

  const modal = new ModalBuilder()
    .setCustomId("budget_modal")
    .setTitle("💰 PC Bütçesi");

  const input = new TextInputBuilder()
    .setCustomId("budget_input")
    .setLabel("Bütçen kaç TL?")
    .setPlaceholder("Örn: 60000")
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
   PC OLUŞTUR
========================================================= */

async function buildPC(session) {

  const budget = session.budget;

  const profile =
    getGameProfile(
      session.game,
      session.cpu,
      session.gpu
    );

  const other =
    getOtherQueries(session);

  /*
    Bütçeyi parçalara bölüyoruz.

    Önce yaklaşık minimum bütçeleri ayırıyoruz.
    Böylece sonradan bütçe aşımı yaşanmıyor.
  */

  const cpuBudget = Math.floor(budget * 0.20);
  const gpuBudget = Math.floor(budget * 0.40);
  const ramBudget = Math.floor(budget * 0.08);
  const ssdBudget = Math.floor(budget * 0.07);
  const motherboardBudget = Math.floor(budget * 0.10);
  const psuBudget = Math.floor(budget * 0.07);
  const caseBudget = Math.floor(budget * 0.08);

  const cpu = await findProduct(
    profile.cpu,
    cpuBudget
  );

  const gpu = await findProduct(
    profile.gpu,
    gpuBudget
  );

  const ram = await findProduct(
    other.ram,
    ramBudget
  );

  const ssd = await findProduct(
    other.ssd,
    ssdBudget
  );

  const motherboard = await findProduct(
    other.motherboard,
    motherboardBudget
  );

  const psu = await findProduct(
    other.psu,
    psuBudget
  );

  const pcCase = await findProduct(
    other.case,
    caseBudget
  );

  const parts = [
    {
      name: "🧠 İşlemci",
      product: cpu
    },
    {
      name: "🎮 Ekran Kartı",
      product: gpu
    },
    {
      name: "🧩 RAM",
      product: ram
    },
    {
      name: "💾 SSD",
      product: ssd
    },
    {
      name: "🔧 Anakart",
      product: motherboard
    },
    {
      name: "⚡ PSU",
      product: psu
    },
    {
      name: "📦 Kasa",
      product: pcCase
    }
  ];

  if (parts.some(x => !x.product)) {
    return {
      error:
        "Canlı fiyatlarda bu bütçeye uygun tüm parçaları bulamadım. Daha yüksek bir bütçe deneyebiliriz."
    };
  }

  let total = parts.reduce(
    (sum, x) =>
      sum + Number(x.product.lowest_price),
    0
  );

  /*
    SON GÜVENLİK KİLİDİ

    Ne olursa olsun bütçe aşılmayacak.
  */

  if (total > budget) {
    return {
      error:
        "Bu bütçede canlı fiyatlarla uyumlu bir sistem oluşturamadım. Bütçeyi aşmamak için sistemi göndermedim."
    };
  }

  return {
    parts,
    total
  };
}

/* =========================================================
   PC SONUÇ EMBED
========================================================= */

function resultEmbed(session, result) {

  const embed = new EmbedBuilder()
    .setTitle("🚀 PC HAZIR!")
    .setDescription(
      `🎮 **Oyun:** ${session.game.toUpperCase()}\n` +
      `💰 **Bütçe:** ${money(session.budget)}\n` +
      `📊 **Toplam:** ${money(result.total)}\n\n` +
      `✅ **Bütçeyi aşmadık.**\n` +
      `💸 **Kalan:** ${money(session.budget - result.total)}`
    );

  for (const part of result.parts) {

    const p = part.product;

    embed.addFields({
      name: part.name,
      value:
        `**${p.title || "Ürün"}**\n` +
        `💵 **${money(p.lowest_price)}**\n` +
        `🔗 [Fiyatı görüntüle](${p.comparison_url || p.url || "https://www.akakce.com/"})`,
      inline: false
    });

  }

  if (session.budget >= 120000) {

    embed.addFields({
      name: "💀 Bütçe seviyesi",
      value:
        "120K+ bütçe açıldı... Bu noktada ekran kartı artık kira ödemeye başladı.",
      inline: false
    });

  }

  embed.setFooter({
    text: "Canlı Akakçe fiyat karşılaştırması • PC Builder"
  });

  return embed;
}

/* =========================================================
   READY
========================================================= */

client.once("ready", async () => {

  console.log(`Bot aktif: ${client.user.tag}`);

  try {

    await rest.put(
      Routes.applicationCommands(client.user.id),
      {
        body: commands
      }
    );

    console.log("Slash komutu kaydedildi!");

  } catch (error) {

    console.error(
      "Slash komut kayıt hatası:",
      error
    );

  }
});

/* =========================================================
   INTERACTIONS
========================================================= */

client.on(
  "interactionCreate",
  async interaction => {

    try {

      /* ===============================
         /pctopla
      =============================== */

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName === "pctopla"
      ) {

        const session =
          newSession(interaction.user.id);

        await interaction.reply({
          embeds: [
            builderEmbed(session)
          ],
          components:
            mainButtons(session),
          ephemeral: false
        });

        return;
      }

      /* ===============================
         BUTONLAR
      =============================== */

      if (interaction.isButton()) {

        const session =
          sessions.get(interaction.user.id);

        if (
          !session ||
          Date.now() - session.createdAt >
            15 * 60 * 1000
        ) {

          return interaction.reply({
            content:
              "❌ Oturum süresi dolmuş. `/pctopla` ile yeniden başla.",
            ephemeral: true
          });

        }

        session.createdAt = Date.now();

        /* BÜTÇE */

        if (interaction.customId === "budget") {

          await interaction.showModal(
            budgetModal()
          );

          return;
        }

        /* OYUN */

        if (interaction.customId === "game") {

          await interaction.reply({
            content: "🎮 Oyununu seç:",
            components: [
              gameMenu()
            ],
            ephemeral: true
          });

          return;
        }

        /* CPU */

        if (interaction.customId === "cpu") {

          await interaction.reply({
            content: "🧠 İşlemci markasını seç:",
            components: [
              cpuMenu()
            ],
            ephemeral: true
          });

          return;
        }

        /* GPU */

        if (interaction.customId === "gpu") {

          await interaction.reply({
            content: "🎮 Ekran kartı markasını seç:",
            components: [
              gpuMenu()
            ],
            ephemeral: true
          });

          return;
        }

        /* OLUŞTUR */

        if (interaction.customId === "create") {

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
                .setTitle("🔎 CANLI FİYATLAR ARANIYOR...")
                .setDescription(
                  "🛒 Akakçe üzerinden güncel fiyatları tarıyorum.\n\n" +
                  "💰 Bütçe kilidi aktif.\n" +
                  "🚫 Bütçe aşılırsa sistem gönderilmeyecek."
                )
            ],
            components: []
          });

          const result =
            await buildPC(session);

          if (result.error) {

            await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setTitle("❌ PC OLUŞTURULAMADI")
                  .setDescription(
                    result.error
                  )
                  .setFooter({
                    text:
                      "PC Builder • Canlı fiyat sistemi"
                  })
              ],
              components: mainButtons(session)
            });

            return;
          }

          await interaction.editReply({
            embeds: [
              resultEmbed(
                session,
                result
              )
            ],
            components: mainButtons(session)
          });

          return;
        }
      }

      /* ===============================
         MODAL
      =============================== */

      if (
        interaction.isModalSubmit() &&
        interaction.customId === "budget_modal"
      ) {

        const session =
          sessions.get(interaction.user.id);

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

        const budget =
          Number(
            raw
              .replace(/\./g, "")
              .replace(/,/g, "")
              .replace(/\s/g, "")
          );

        if (
          !Number.isFinite(budget) ||
          budget < 10000 ||
          budget > 500000
        ) {

          return interaction.reply({
            content:
              "❌ Bütçe **10.000 TL ile 500.000 TL** arasında olmalı.",
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

      /* ===============================
         SELECT MENÜLER
      =============================== */

      if (interaction.isStringSelectMenu()) {

        const session =
          sessions.get(interaction.user.id);

        if (!session) {

          return interaction.reply({
            content:
              "❌ Oturum bulunamadı. `/pctopla` ile yeniden başla.",
            ephemeral: true
          });

        }

        session.createdAt =
          Date.now();

        /* OYUN */

        if (
          interaction.customId ===
          "game_select"
        ) {

          session.game =
            interaction.values[0];

          await interaction.update({
            content:
              `🎮 Oyun seçildi: **${session.game.toUpperCase()}**`,
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
              `🧠 CPU seçildi: **${session.cpu.toUpperCase()}**`,
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
              `🎮 GPU seçildi: **${session.gpu.toUpperCase()}**`,
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

      if (!interaction.replied &&
          !interaction.deferred) {

        await interaction.reply({
          content:
            "❌ Bir hata oluştu. Konsolu kontrol et.",
          ephemeral: true
        });

      }

    }

  }
);

/* =========================================================
   LOGIN
========================================================= */

client.login(TOKEN);