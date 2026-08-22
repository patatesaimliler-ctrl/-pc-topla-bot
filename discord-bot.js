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

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const REEF_KEY = process.env.REEF_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_MODEL = "gemini-2.5-flash";

const commands = [
  new SlashCommandBuilder()
    .setName("pctopla")
    .setDescription("Yapay zekâ destekli canlı fiyatlarla PC oluştur.")
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

/* =========================================================
   GEMINI
========================================================= */

async function askGemini(butce, oyun, cpu, gpu) {
  const prompt = `
Sen Türkiye'de PC toplama konusunda uzman bir sistem oluşturucusun.

KULLANICI BİLGİLERİ:
- Maksimum bütçe: ${butce} TL
- Oyun: ${oyun}
- İşlemci markası: ${cpu}
- Ekran kartı markası: ${gpu}

GÖREV:
Bu bütçeyi ASLA aşmayacak şekilde dengeli bir masaüstü bilgisayar oluştur.

ÖNEMLİ:
- Fiyat tahmini yapma.
- İnternetten fiyat uydurma.
- Sadece hangi ürünlerin aranması gerektiğini belirle.
- CPU markası seçimine kesinlikle uy.
- GPU markası seçimine kesinlikle uy.
- Seçilen oyunda yüksek FPS hedefle.
- Anakartı CPU ile uyumlu seç.
- RAM'i anakarta uygun seç.
- PSU'yu ekran kartına göre güvenli seç.
- SSD en az 1 TB olsun.
- Kasa hava akışı iyi bir model olsun.
- Gereksiz pahalı parçalar seçme.
- Ürün isimlerini Türkiye'deki mağazalarda aranabilecek şekilde yaz.

ŞU 7 PARÇAYI MUTLAKA VER:
1. CPU
2. GPU
3. RAM
4. SSD
5. Anakart
6. PSU
7. Kasa

Ayrıca her parçaya bir "maksimum_arama_fiyati" belirle.
Bu fiyatların toplamı ${butce} TL'yi geçmemeli.

SADECE GEÇERLİ JSON DÖNDÜR:

{
  "aciklama": "kısa açıklama",
  "cpu": {
    "arama": "ürün arama adı",
    "maksimum_arama_fiyati": 0
  },
  "gpu": {
    "arama": "ürün arama adı",
    "maksimum_arama_fiyati": 0
  },
  "ram": {
    "arama": "ürün arama adı",
    "maksimum_arama_fiyati": 0
  },
  "ssd": {
    "arama": "ürün arama adı",
    "maksimum_arama_fiyati": 0
  },
  "anakart": {
    "arama": "ürün arama adı",
    "maksimum_arama_fiyati": 0
  },
  "psu": {
    "arama": "ürün arama adı",
    "maksimum_arama_fiyati": 0
  },
  "kasa": {
    "arama": "ürün arama adı",
    "maksimum_arama_fiyati": 0
  }
}
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini boş cevap verdi.");
  }

  return JSON.parse(text);
}

/* =========================================================
   REEFAPI TRENDYOL
========================================================= */

async function reefSearch(query, maxPrice) {
  const response = await fetch(
    "https://api.reefapi.com/trendyol/v1/search",
    {
      method: "POST",
      headers: {
        "x-api-key": REEF_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        page: 1,
        max_pages: 1,
        sort: "price_asc",
        price: `0-${Math.floor(maxPrice)}`
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ReefAPI ${response.status}: ${errorText}`);
  }

  const json = await response.json();

  if (!json.ok) {
    throw new Error(
      json.error?.message ||
      "ReefAPI hata döndürdü."
    );
  }

  const results = json.data?.results || [];

  return results
    .filter(p =>
      p &&
      typeof p.price === "number" &&
      p.price > 0 &&
      p.price <= maxPrice &&
      p.title &&
      p.url
    )
    .sort((a, b) => a.price - b.price);
}

/* =========================================================
   ÜRÜN DOĞRULAMA
========================================================= */

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function validProduct(product, type) {
  const title = normalize(product.title);

  if (type === "cpu") {
    return (
      title.includes("ryzen") ||
      title.includes("core i") ||
      title.includes("core ultra")
    );
  }

  if (type === "gpu") {
    return (
      title.includes("rtx ") ||
      title.includes("rx ") ||
      title.includes("geforce") ||
      title.includes("radeon")
    );
  }

  if (type === "ram") {
    return (
      title.includes("ram") &&
      (title.includes("ddr4") || title.includes("ddr5"))
    );
  }

  if (type === "ssd") {
    return (
      title.includes("ssd") &&
      !title.includes("kutu") &&
      !title.includes("hard disk kutu") &&
      !title.includes("adapt")
    );
  }

  if (type === "anakart") {
    return (
      title.includes("anakart") ||
      title.includes("motherboard") ||
      title.includes("b550") ||
      title.includes("b650") ||
      title.includes("b660") ||
      title.includes("b760") ||
      title.includes("x670") ||
      title.includes("x870")
    );
  }

  if (type === "psu") {
    return (
      title.includes("psu") ||
      title.includes("power supply") ||
      title.includes("guc kaynagi")
    );
  }

  if (type === "kasa") {
    return (
      title.includes("kasa") ||
      title.includes("gaming case") ||
      title.includes("pc case")
    );
  }

  return true;
}

/* =========================================================
   EN UYGUN ÜRÜNÜ BUL
========================================================= */

async function findProduct(type, aiPart) {
  const results = await reefSearch(
    aiPart.arama,
    aiPart.maksimum_arama_fiyati
  );

  const valid = results.filter(p =>
    validProduct(p, type)
  );

  return valid[0] || null;
}

/* =========================================================
   PARA
========================================================= */

function money(value) {
  return `${Math.round(value).toLocaleString("tr-TR")} TL`;
}

/* =========================================================
   PC OLUŞTUR
========================================================= */

async function buildPC(butce, oyun, cpu, gpu) {

  // 1️⃣ Önce Gemini'den sistem planını al
  const ai = await askGemini(
    butce,
    oyun,
    cpu,
    gpu
  );

  // 2️⃣ Sonra ReefAPI'de canlı ara
  const types = [
    "cpu",
    "gpu",
    "ram",
    "ssd",
    "anakart",
    "psu",
    "kasa"
  ];

  const products = {};

  for (const type of types) {
    products[type] = await findProduct(
      type,
      ai[type]
    );
  }

  // 3️⃣ Eksik ürün kontrolü
  const missing = types.filter(
    type => !products[type]
  );

  if (missing.length) {
    throw new Error(
      `Canlı fiyatlarda bulunamayan parçalar: ${missing.join(", ")}`
    );
  }

  // 4️⃣ Toplam
  let total = 0;

  for (const type of types) {
    total += products[type].price;
  }

  // 5️⃣ ASLA bütçeyi geçme
  if (total > butce) {
    throw new Error(
      `Bütçe aşıldı: ${money(total)} / ${money(butce)}`
    );
  }

  return {
    ai,
    products,
    total
  };
}

/* =========================================================
   ANA KOMUT
========================================================= */

client.once("clientReady", async () => {
  console.log(`🤖 Bot aktif: ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      {
        body: commands
      }
    );

    console.log("✅ /pctopla kaydedildi.");
  } catch (error) {
    console.error(error);
  }
});

/* =========================================================
   ETKİLEŞİMLER
========================================================= */

client.on("interactionCreate", async interaction => {

  /* =========================
     /pctopla
  ========================= */

  if (
    interaction.isChatInputCommand() &&
    interaction.commandName === "pctopla"
  ) {

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("🖥️ PC TOPLA")
      .setDescription(
        "🚀 **AI + canlı fiyat sistemi**\n\n" +
        "Önce seçeneklerini belirle.\n" +
        "Sonra **PC'Yİ OLUŞTUR** butonuna bas.\n\n" +
        "💡 Anakart, RAM, SSD, PSU ve kasa seçimini " +
        "**Gemini yapacak**."
      )
      .addFields(
        {
          name: "💰 Bütçe",
          value: "Henüz seçilmedi",
          inline: true
        },
        {
          name: "🎮 Oyun",
          value: "Henüz seçilmedi",
          inline: true
        },
        {
          name: "🧠 CPU",
          value: "AMD",
          inline: true
        },
        {
          name: "🎮 GPU",
          value: "NVIDIA",
          inline: true
        }
      )
      .setFooter({
        text: "PC Builder • Gemini + ReefAPI canlı fiyat"
      });

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("budget")
        .setLabel("💰 Bütçe")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("game")
        .setLabel("🎮 Oyun")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("cpu")
        .setLabel("🧠 CPU: AMD")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("gpu")
        .setLabel("🎮 GPU: NVIDIA")
        .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("build")
        .setLabel("🚀 PC'Yİ OLUŞTUR")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row1, row2]
    });

    return;
  }

  /* =========================
     BUTONLAR
  ========================= */

  if (!interaction.isButton()) return;

  /* ---------- BÜTÇE ---------- */

  if (interaction.customId === "budget") {

    const modal = new ModalBuilder()
      .setCustomId("budget_modal")
      .setTitle("💰 Bütçe");

    const input = new TextInputBuilder()
      .setCustomId("budget_value")
      .setLabel("Maksimum bütçen kaç TL?")
      .setPlaceholder("Örn: 75000")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(input)
    );

    await interaction.showModal(modal);
    return;
  }

  /* ---------- OYUN ---------- */

  if (interaction.customId === "game") {

    const menu = new StringSelectMenuBuilder()
      .setCustomId("game_select")
      .setPlaceholder("🎮 Oyun seç")
      .addOptions(
        {
          label: "VALORANT",
          value: "VALORANT"
        },
        {
          label: "CS2",
          value: "CS2"
        },
        {
          label: "Fortnite",
          value: "Fortnite"
        },
        {
          label: "Minecraft",
          value: "Minecraft"
        },
        {
          label: "GTA V",
          value: "GTA V"
        },
        {
          label: "Red Dead Redemption 2",
          value: "Red Dead Redemption 2"
        },
        {
          label: "EA SPORTS FC",
          value: "EA SPORTS FC"
        }
      );

    await interaction.reply({
      content: "🎮 **Oynayacağın oyunu seç:**",
      components: [
        new ActionRowBuilder().addComponents(menu)
      ],
      ephemeral: true
    });

    return;
  }

  /* ---------- CPU ---------- */

  if (interaction.customId === "cpu") {

    const menu = new StringSelectMenuBuilder()
      .setCustomId("cpu_select")
      .setPlaceholder("🧠 CPU markası")
      .addOptions(
        {
          label: "AMD",
          value: "AMD"
        },
        {
          label: "Intel",
          value: "Intel"
        }
      );

    await interaction.reply({
      content: "🧠 **İşlemci markası:**",
      components: [
        new ActionRowBuilder().addComponents(menu)
      ],
      ephemeral: true
    });

    return;
  }

  /* ---------- GPU ---------- */

  if (interaction.customId === "gpu") {

    const menu = new StringSelectMenuBuilder()
      .setCustomId("gpu_select")
      .setPlaceholder("🎮 GPU markası")
      .addOptions(
        {
          label: "NVIDIA",
          value: "NVIDIA"
        },
        {
          label: "AMD",
          value: "AMD"
        }
      );

    await interaction.reply({
      content: "🎮 **Ekran kartı markası:**",
      components: [
        new ActionRowBuilder().addComponents(menu)
      ],
      ephemeral: true
    });

    return;
  }

  /* ---------- OLUŞTUR ---------- */

  if (interaction.customId === "build") {

    const message = interaction.message;

    const budgetText =
      message.embeds[0]?.fields?.find(
        x => x.name === "💰 Bütçe"
      )?.value;

    const game =
      message.embeds[0]?.fields?.find(
        x => x.name === "🎮 Oyun"
      )?.value;

    const cpu =
      message.embeds[0]?.fields?.find(
        x => x.name === "🧠 CPU"
      )?.value || "AMD";

    const gpu =
      message.embeds[0]?.fields?.find(
        x => x.name === "🎮 GPU"
      )?.value || "NVIDIA";

    const budget = Number(
      budgetText?.replace(/\D/g, "")
    );

    if (!budget || !game) {
      await interaction.reply({
        content:
          "❌ Önce **bütçe** ve **oyun** seçmelisin.",
        ephemeral: true
      });

      return;
    }

    await interaction.deferReply();

    try {

      const result = await buildPC(
        budget,
        game,
        cpu,
        gpu
      );

      const { products, total, ai } = result;

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle("🖥️ PC HAZIR")
        .setDescription(
          `🎮 **Oyun:** ${game}\n` +
          `🧠 **CPU:** ${cpu}\n` +
          `🎮 **GPU:** ${gpu}\n\n` +
          `🤖 ${ai.aciklama || "Gemini tarafından oluşturuldu."}`
        );

      const names = {
        cpu: "🧠 İşlemci",
        gpu: "🎮 Ekran Kartı",
        ram: "🧩 RAM",
        ssd: "💾 SSD",
        anakart: "🔧 Anakart",
        psu: "⚡ PSU",
        kasa: "📦 Kasa"
      };

      for (const type of Object.keys(names)) {

        const p = products[type];

        embed.addFields({
          name: names[type],
          value:
            `**${p.title}**\n` +
            `💰 **${money(p.price)}**\n` +
            `🏪 ${p.brand || "Mağaza"}\n` +
            `🔗 [Ürüne git](${p.url})`,
          inline: false
        });
      }

      embed.addFields({
        name: "💰 TOPLAM",
        value:
          `**${money(total)}** / ${money(budget)}\n` +
          `✅ **Bütçe aşılmadı.**\n` +
          `💸 Kalan: **${money(budget - total)}**`,
        inline: false
      });

      if (budget >= 120000) {
        embed.addFields({
          name: "💀 120K+ Bölgesi",
          value:
            "Bu bütçede artık ekran kartı sana sistem toplamaya başlıyor. 😭",
          inline: false
        });
      }

      embed.setFooter({
        text: "PC Builder • Gemini planı + ReefAPI canlı Trendyol fiyatı"
      });

      await interaction.editReply({
        embeds: [embed]
      });

    } catch (error) {

      console.error("PC OLUŞTURMA HATASI:", error);

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle("❌ PC OLUŞTURULAMADI")
            .setDescription(
              "Gemini parçaları belirledi fakat ReefAPI'de " +
              "bu parçaların bütçeye uygun canlı sonuçlarını bulamadım.\n\n" +
              "💡 Daha yüksek bütçe veya farklı oyun deneyebilirsin."
            )
            .setFooter({
              text: "PC Builder"
            })
        ]
      });
    }

    return;
  }

  /* =========================================================
     MODAL
  ========================================================= */

  if (
    interaction.isModalSubmit() &&
    interaction.customId === "budget_modal"
  ) {

    const value =
      interaction.fields.getTextInputValue(
        "budget_value"
      );

    const budget = Number(
      value.replace(/\D/g, "")
    );

    if (!budget || budget < 10000) {
      await interaction.reply({
        content:
          "❌ Geçerli bir bütçe gir. Minimum 10.000 TL.",
        ephemeral: true
      });

      return;
    }

    const embed =
      EmbedBuilder.from(interaction.message.embeds[0]);

    const fields = embed.data.fields || [];

    const index = fields.findIndex(
      x => x.name === "💰 Bütçe"
    );

    if (index !== -1) {
      fields[index].value =
        `${budget.toLocaleString("tr-TR")} TL`;
    }

    embed.setFields(fields);

    await interaction.update({
      embeds: [embed],
      components: interaction.message.components
    });

    return;
  }

  /* =========================================================
     SELECT MENÜLER
  ========================================================= */

  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId === "game_select") {

    const game = interaction.values[0];

    await interaction.update({
      content: `✅ Oyun seçildi: **${game}**`,
      components: []
    });

    const original = interaction.message;

    // Select mesajından ana komutu değiştiremiyoruz.
    // Bu yüzden kullanıcıya oyun seçimini gösteriyoruz.
    return;
  }

  if (interaction.customId === "cpu_select") {

    const cpu = interaction.values[0];

    await interaction.update({
      content: `✅ CPU seçildi: **${cpu}**`,
      components: []
    });

    return;
  }

  if (interaction.customId === "gpu_select") {

    const gpu = interaction.values[0];

    await interaction.update({
      content: `✅ GPU seçildi: **${gpu}**`,
      components: []
    });

    return;
  }
});

/* =========================================================
   LOGIN
========================================================= */

client.login(DISCORD_TOKEN);