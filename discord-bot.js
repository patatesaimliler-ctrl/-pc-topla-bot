const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

const cheerio = require("cheerio");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* =========================
   SLASH COMMAND
========================= */

const commands = [
  new SlashCommandBuilder()
    .setName("pc-topla")
    .setDescription("Akakçe güncel fiyatlarıyla PC toplar.")

    .addIntegerOption(option =>
      option
        .setName("butce")
        .setDescription("Bütçen TL olarak")
        .setRequired(true)
        .setMinValue(15000)
        .setMaxValue(500000)
    )

    .addStringOption(option =>
      option
        .setName("kullanim")
        .setDescription("Kullanım amacı")
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


/* =========================
   DISCORD REST
========================= */

const rest = new REST({ version: "10" })
  .setToken(process.env.DISCORD_TOKEN);


/* =========================
   AKAKÇE SAYFASI
========================= */

async function getAkakcePage(query) {

  const url =
    "https://www.akakce.com/arama/?q=" +
    encodeURIComponent(query);

  console.log("Akakçe:", query);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/139 Safari/537.36",
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language":
        "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
    }
  });

  if (!response.ok) {
    throw new Error(
      `Akakçe HTTP ${response.status}`
    );
  }

  return await response.text();
}


/* =========================
   FİYAT PARSE
========================= */

function parseTurkishPrice(text) {

  if (!text) return null;

  const match = text.match(
    /(?:En Ucuz|en ucuz)\s*([\d.]+(?:,\d{1,2})?)\s*TL/i
  );

  if (!match) return null;

  return Number(
    match[1]
      .replace(/\./g, "")
      .replace(",", ".")
  );
}


/* =========================
   AKAKÇE ÜRÜN ARAMA
========================= */

async function searchAkakce(query) {

  const html =
    await getAkakcePage(query);

  const $ = cheerio.load(html);

  const products = [];

  const seen = new Set();


  /*
    Akakçe arama sonuçlarındaki
    ürün bağlantılarını buluyoruz.
  */

  $("a").each((i, el) => {

    const href =
      $(el).attr("href");

    if (!href) return;


    let url = href;

    if (url.startsWith("/")) {
      url =
        "https://www.akakce.com" +
        url;
    }


    if (
      !url.startsWith(
        "https://www.akakce.com/"
      )
    ) {
      return;
    }


    const text =
      $(el)
        .text()
        .replace(/\s+/g, " ")
        .trim();


    if (!text) return;


    /*
      Ürün sonucu genellikle
      "En Ucuz ... TL"
      metnini içeriyor.
    */

    const price =
      parseTurkishPrice(text);


    if (!price) return;


    /*
      Arama sonucunda ürün sayfası
      olmayan bağlantıları ele.
    */

    if (
      !url.includes(
        "/islemci/"
      ) &&
      !url.includes(
        "/ekran-karti/"
      ) &&
      !url.includes(
        "/ram/"
      ) &&
      !url.includes(
        "/ssd/"
      ) &&
      !url.includes(
        "/anakart/"
      ) &&
      !url.includes(
        "/power-supply/"
      ) &&
      !url.includes(
        "/kasa/"
      ) &&
      !url.includes(
        "/oyun-bilgisayari/"
      )
    ) {
      return;
    }


    if (seen.has(url)) return;

    seen.add(url);


    /*
      "En Ucuz..." kısmını ürün
      isminden temizle.
    */

    let name =
      text
        .replace(
          /En Ucuz.*$/i,
          ""
        )
        .trim();


    if (
      name.length < 5
    ) {
      name = query;
    }


    products.push({
      name,
      price,
      url
    });

  });


  /*
    En ucuzdan pahalıya sırala.
  */

  products.sort(
    (a, b) =>
      a.price - b.price
  );


  console.log(
    `${query}: ${products.length} ürün`
  );


  return products.slice(0, 10);
}


/* =========================
   ÜRÜN BUL
========================= */

async function findProduct(queries) {

  for (const query of queries) {

    try {

      const results =
        await searchAkakce(query);


      if (results.length) {

        return results[0];

      }

    } catch (error) {

      console.error(
        query,
        error.message
      );

    }

  }

  return null;
}


/* =========================
   PARA FORMAT
========================= */

function money(value) {

  return (
    Math.round(value)
      .toLocaleString("tr-TR") +
    " TL"
  );

}


/* =========================
   PARÇA SORGULARI
========================= */

function createQueries(
  budget,
  cpu,
  gpu
) {

  let cpuQueries;
  let gpuQueries;


  /* CPU */

  if (cpu === "amd") {

    if (budget < 40000) {

      cpuQueries = [
        "Ryzen 5 5500",
        "Ryzen 5 5600"
      ];

    } else if (budget < 70000) {

      cpuQueries = [
        "Ryzen 5 7500F",
        "Ryzen 5 7600"
      ];

    } else {

      cpuQueries = [
        "Ryzen 7 7800X3D",
        "Ryzen 7 9800X3D"
      ];

    }

  } else {

    if (budget < 40000) {

      cpuQueries = [
        "Intel Core i3-12100F",
        "Intel Core i5-12400F"
      ];

    } else if (budget < 70000) {

      cpuQueries = [
        "Intel Core i5-14400F",
        "Intel Core i5-14600KF"
      ];

    } else {

      cpuQueries = [
        "Intel Core i7-14700F",
        "Intel Core Ultra 7"
      ];

    }

  }


  /* GPU */

  if (gpu === "nvidia") {

    if (budget < 40000) {

      gpuQueries = [
        "RTX 3050",
        "RTX 4060"
      ];

    } else if (budget < 70000) {

      gpuQueries = [
        "RTX 4060",
        "RTX 4060 Ti"
      ];

    } else if (budget < 100000) {

      gpuQueries = [
        "RTX 5070",
        "RTX 4070 SUPER"
      ];

    } else {

      gpuQueries = [
        "RTX 5080",
        "RTX 5090"
      ];

    }

  } else {

    if (budget < 40000) {

      gpuQueries = [
        "RX 6600",
        "RX 7600"
      ];

    } else if (budget < 70000) {

      gpuQueries = [
        "RX 7600 XT",
        "RX 7700 XT"
      ];

    } else if (budget < 100000) {

      gpuQueries = [
        "RX 7800 XT",
        "RX 7900 GRE"
      ];

    } else {

      gpuQueries = [
        "RX 9070 XT",
        "RX 7900 XTX"
      ];

    }

  }


  return {

    cpu: cpuQueries,

    gpu: gpuQueries,

    ram:
      budget < 50000
        ? [
            "16GB DDR4 RAM",
            "16GB DDR5 RAM"
          ]
        : [
            "32GB DDR5 RAM",
            "32GB DDR5 6000"
          ],

    ssd:
      budget < 50000
        ? [
            "500GB NVMe SSD",
            "1TB NVMe SSD"
          ]
        : [
            "1TB NVMe SSD",
            "2TB NVMe SSD"
          ],

    motherboard:
      cpu === "amd"
        ? [
            "B550 anakart",
            "B650 anakart"
          ]
        : [
            "B660 anakart",
            "B760 anakart"
          ],

    psu:
      budget < 50000
        ? [
            "550W 80 Plus Bronze PSU",
            "650W 80 Plus Bronze PSU"
          ]
        : [
            "650W 80 Plus Gold PSU",
            "750W 80 Plus Gold PSU"
          ],

    case: [
      "Mesh ATX kasa",
      "Airflow ATX kasa"
    ]

  };

}


/* =========================
   BOT READY
========================= */

client.once(
  "ready",
  async () => {

    console.log(
      `Bot aktif: ${client.user.tag}`
    );


    try {

      await rest.put(
        Routes.applicationCommands(
          client.user.id
        ),
        {
          body: commands
        }
      );


      console.log(
        "Slash komutları kaydedildi!"
      );

    } catch (error) {

      console.error(
        "Slash komut hatası:",
        error
      );

    }

  }
);


/* =========================
   KOMUT
========================= */

client.on(
  "interactionCreate",
  async interaction => {

    if (
      !interaction.isChatInputCommand()
    ) {
      return;
    }


    if (
      interaction.commandName !==
      "pc-topla"
    ) {
      return;
    }


    const budget =
      interaction.options
        .getInteger("butce");

    const usage =
      interaction.options
        .getString("kullanim");

    const cpu =
      interaction.options
        .getString("cpu");

    const gpu =
      interaction.options
        .getString("gpu");


    await interaction.deferReply();


    try {

      console.log(
        "PC oluşturuluyor:",
        budget,
        cpu,
        gpu
      );


      const queries =
        createQueries(
          budget,
          cpu,
          gpu
        );


      /*
        Sırayla arıyoruz.
        Böylece Akakçe'ye aynı anda
        7 istek göndermiyoruz.
      */

      const cpuProduct =
        await findProduct(
          queries.cpu
        );

      const gpuProduct =
        await findProduct(
          queries.gpu
        );

      const ramProduct =
        await findProduct(
          queries.ram
        );

      const ssdProduct =
        await findProduct(
          queries.ssd
        );

      const motherboardProduct =
        await findProduct(
          queries.motherboard
        );

      const psuProduct =
        await findProduct(
          queries.psu
        );

      const caseProduct =
        await findProduct(
          queries.case
        );


      const parts = [

        {
          name: "🧠 İşlemci",
          product: cpuProduct
        },

        {
          name: "🎮 Ekran Kartı",
          product: gpuProduct
        },

        {
          name: "🧩 RAM",
          product: ramProduct
        },

        {
          name: "💾 SSD",
          product: ssdProduct
        },

        {
          name: "🔧 Anakart",
          product: motherboardProduct
        },

        {
          name: "⚡ PSU",
          product: psuProduct
        },

        {
          name: "📦 Kasa",
          product: caseProduct
        }

      ];


      const missing =
        parts.filter(
          x => !x.product
        );


      if (missing.length) {

        await interaction.editReply(
          "❌ Akakçe'de ürün bulunamadı:\n\n" +
          missing
            .map(x => x.name)
            .join("\n")
        );

        return;

      }


      let total = 0;


      for (
        const part of parts
      ) {

        total +=
          part.product.price;

      }


      /* =========================
         EMBED
      ========================= */

      const embed =
        new EmbedBuilder()

          .setTitle(
            "🖥️ PC Builder Bot"
          )

          .setDescription(
            "🌐 **Akakçe canlı fiyatları**\n\n" +

            `💰 **Bütçe:** ${money(
              budget
            )}\n` +

            `🎯 **Kullanım:** ${usage}\n` +

            `🧠 **CPU tercihi:** ${cpu.toUpperCase()}\n` +

            `🎮 **GPU tercihi:** ${gpu.toUpperCase()}`
          );


      for (
        const part of parts
      ) {

        const product =
          part.product;


        embed.addFields({

          name:
            part.name,

          value:

            `**${product.name}**\n` +

            `💰 **${money(
              product.price
            )}**\n` +

            `🔗 [Akakçe'de aç](${
              product.url
            })`,

          inline: false

        });

      }


      embed.addFields({

        name: "💰 TOPLAM",

        value:

          `**${money(total)}**\n\n` +

          (
            total <= budget

              ? `✅ Bütçenin **${money(
                  budget - total
                )}** altında.`

              : `⚠️ Bütçeyi **${money(
                  total - budget
                )}** aşıyor.`
          ),

        inline: false

      });


      embed.setFooter({

        text:
          "Akakçe fiyatları • PC Builder Bot"

      });


      await interaction.editReply({

        embeds: [
          embed
        ]

      });


    } catch (error) {

      console.error(
        "PC TOPLA HATASI:",
        error
      );


      await interaction.editReply(

        "❌ Akakçe'ye bağlanırken hata oluştu.\n" +
        "Railway Console'daki hatayı kontrol et."

      );

    }

  }
);


/* =========================
   LOGIN
========================= */

client.login(
  process.env.DISCORD_TOKEN
);