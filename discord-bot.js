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
    .setDescription("Akakçe güncel fiyatlarıyla PC önerir.")
    .addIntegerOption(option =>
      option
        .setName("butce")
        .setDescription("Bütçen TL olarak")
        .setRequired(true)
        .setMinValue(10000)
        .setMaxValue(500000)
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

/* =========================
   AKAKÇE
========================= */

async function akakceSearch(searchQuery) {
  const token = process.env.APIFY_TOKEN;

  if (!token) {
    throw new Error("APIFY_TOKEN bulunamadı!");
  }

  const response = await fetch(
    `https://api.apify.com/v2/acts/studio-amba~akakce-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        searchQuery,
        maxResults: 5,
        includeOffers: false,
        proxyConfiguration: {
          useApifyProxy: true,
          apifyProxyGroups: ["RESIDENTIAL"],
          apifyProxyCountry: "TR"
        }
      })
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Akakçe/Apify hatası: ${response.status} ${text}`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Akakçe beklenmeyen veri döndürdü.");
  }

  return data
    .filter(item =>
      item &&
      typeof item.lowestPrice === "number" &&
      item.lowestPrice > 0 &&
      item.productName
    )
    .sort((a, b) => a.lowestPrice - b.lowestPrice);
}

async function findProduct(searchQuery) {
  const results = await akakceSearch(searchQuery);

  if (!results.length) {
    return null;
  }

  return results[0];
}

function money(price) {
  return `${Math.round(price).toLocaleString("tr-TR")} TL`;
}

/* =========================
   PC PARÇA ARAMALARI
========================= */

function createPartQueries(butce, cpu, gpu) {
  let cpuQueries;
  let gpuQueries;

  if (cpu === "amd") {
    if (butce < 40000) {
      cpuQueries = ["Ryzen 5 5500", "Ryzen 5 5600"];
    } else if (butce < 70000) {
      cpuQueries = ["Ryzen 5 7500F", "Ryzen 5 7600"];
    } else {
      cpuQueries = ["Ryzen 7 7800X3D", "Ryzen 7 9800X3D"];
    }
  } else {
    if (butce < 40000) {
      cpuQueries = ["Intel Core i3-12100F", "Intel Core i5-12400F"];
    } else if (butce < 70000) {
      cpuQueries = ["Intel Core i5-14400F", "Intel Core i5-14600KF"];
    } else {
      cpuQueries = ["Intel Core i7-14700F", "Intel Core Ultra 7"];
    }
  }

  if (gpu === "nvidia") {
    if (butce < 40000) {
      gpuQueries = ["RTX 3050", "RTX 4060"];
    } else if (butce < 70000) {
      gpuQueries = ["RTX 4060", "RTX 4060 Ti"];
    } else if (butce < 100000) {
      gpuQueries = ["RTX 4070 SUPER", "RTX 5070"];
    } else {
      gpuQueries = ["RTX 5080", "RTX 5090"];
    }
  } else {
    if (butce < 40000) {
      gpuQueries = ["RX 6600", "RX 7600"];
    } else if (butce < 70000) {
      gpuQueries = ["RX 7600 XT", "RX 7700 XT"];
    } else if (butce < 100000) {
      gpuQueries = ["RX 7800 XT", "RX 7900 GRE"];
    } else {
      gpuQueries = ["RX 9070 XT", "RX 7900 XTX"];
    }
  }

  return {
    cpuQueries,
    gpuQueries,
    ramQueries: butce < 50000
      ? ["16GB DDR4 RAM 3200", "16GB DDR5 RAM"]
      : ["32GB DDR5 RAM", "32GB DDR5 6000"],
    ssdQueries: butce < 50000
      ? ["500GB NVMe SSD", "1TB NVMe SSD"]
      : ["1TB NVMe SSD", "2TB NVMe SSD"],
    motherboardQueries:
      cpu === "amd"
        ? ["B550 anakart", "B650 anakart"]
        : ["B660 anakart", "B760 anakart"],
    psuQueries:
      butce < 50000
        ? ["550W 80 Plus Bronze PSU", "650W 80 Plus Bronze PSU"]
        : ["650W 80 Plus Gold PSU", "750W 80 Plus Gold PSU"],
    caseQueries:
      ["Mesh ATX kasa", "Airflow ATX kasa"]
  };
}

/* =========================
   BOT READY
========================= */

client.once("ready", async () => {
  console.log(`Bot aktif: ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );

    console.log("Slash komutları kaydedildi!");
  } catch (error) {
    console.error("Slash komut hatası:", error);
  }
});

/* =========================
   KOMUT
========================= */

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "pc-topla") return;

  const butce = interaction.options.getInteger("butce");
  const kullanim = interaction.options.getString("kullanim");
  const cpu = interaction.options.getString("cpu");
  const gpu = interaction.options.getString("gpu");

  await interaction.deferReply();

  try {
    const queries = createPartQueries(butce, cpu, gpu);

    /*
      Aynı anda arıyoruz.
      Böylece 7 ayrı Akakçe isteği sırayla beklemiyor.
    */

    const [
      cpuResult,
      gpuResult,
      ramResult,
      ssdResult,
      motherboardResult,
      psuResult,
      caseResult
    ] = await Promise.all([
      findProduct(queries.cpuQueries[0]),
      findProduct(queries.gpuQueries[0]),
      findProduct(queries.ramQueries[0]),
      findProduct(queries.ssdQueries[0]),
      findProduct(queries.motherboardQueries[0]),
      findProduct(queries.psuQueries[0]),
      findProduct(queries.caseQueries[0])
    ]);

    const parts = [
      { name: "🧠 İşlemci", product: cpuResult },
      { name: "🎮 Ekran Kartı", product: gpuResult },
      { name: "🧩 RAM", product: ramResult },
      { name: "💾 SSD", product: ssdResult },
      { name: "🔧 Anakart", product: motherboardResult },
      { name: "⚡ PSU", product: psuResult },
      { name: "📦 Kasa", product: caseResult }
    ];

    const missing = parts.filter(x => !x.product);

    if (missing.length > 0) {
      await interaction.editReply(
        `❌ Akakçe'den şu parçaları bulamadım: ${missing
          .map(x => x.name)
          .join(", ")}`
      );
      return;
    }

    let total = 0;

    for (const part of parts) {
      total += part.product.lowestPrice;
    }

    const embed = new EmbedBuilder()
      .setTitle("🖥️ PC Builder Bot")
      .setDescription(
        `💰 **Bütçe:** ${money(butce)}\n` +
        `🎯 **Kullanım:** ${kullanim}\n` +
        `🧠 **CPU tercihi:** ${cpu.toUpperCase()}\n` +
        `🎮 **GPU tercihi:** ${gpu.toUpperCase()}\n\n` +
        `📊 **Akakçe'den güncel fiyatlarla hesaplandı.**`
      );

    for (const part of parts) {
      const p = part.product;

      embed.addFields({
        name: part.name,
        value:
          `**${p.productName}**\n` +
          `💵 ${money(p.lowestPrice)}\n` +
          `🔗 [Akakçe'de görüntüle](${p.url})`,
        inline: false
      });
    }

    embed.addFields({
      name: "💰 Toplam",
      value:
        `**${money(total)}**\n` +
        (total <= butce
          ? `✅ Bütçenin ${money(butce - total)} altında`
          : `⚠️ Bütçeyi ${money(total - butce)} aşıyor`),
      inline: false
    });

    embed.setFooter({
      text: "Fiyatlar Akakçe üzerinden alınmıştır • PC Builder Bot"
    });

    await interaction.editReply({
      embeds: [embed]
    });

  } catch (error) {
    console.error("PC TOPLA HATASI:", error);

    await interaction.editReply(
      "❌ Akakçe fiyatlarını alırken bir hata oluştu. Birkaç saniye sonra tekrar dene."
    );
  }
});

client.login(process.env.DISCORD_TOKEN);