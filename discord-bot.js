const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages] });

// Reef API config
const REEF_API_URL = 'https://api.reefapi.com/search';
const REEF_API_KEY = process.env.REEF_API_KEY;

// Session storage
const userSessions = {};

const OYUNLAR = ['VALORANT', 'CS2', 'Minecraft', 'Fortnite', 'GTA V', 'Red Dead Redemption 2', 'EA SPORTS FC', 'Cyberpunk 2077'];
const CPULAR = ['AMD', 'Intel'];
const GPULAR = ['NVIDIA', 'AMD'];

// PC Konfigürasyonları - Oyun ve Bütçeye göre
const PC_CONFIGS = {
  'VALORANT': {
    '<25000': {
      cpu: 'Ryzen 3 7100F',
      gpu: 'GTX 1650',
      ram: '16GB DDR5',
      ssd: '512GB NVMe',
      motherboard: 'B550M',
      psu: '500W',
      case: 'Mid-Tower'
    },
    '25000-40000': {
      cpu: 'Ryzen 5 5500',
      gpu: 'RTX 3060',
      ram: '16GB DDR5',
      ssd: '512GB NVMe',
      motherboard: 'B550',
      psu: '550W',
      case: 'Mid-Tower'
    },
    '40000-60000': {
      cpu: 'Ryzen 5 7500F',
      gpu: 'RTX 4060',
      ram: '32GB DDR5',
      ssd: '1TB NVMe',
      motherboard: 'B650M',
      psu: '650W',
      case: 'Mid-Tower'
    },
    '60000+': {
      cpu: 'Ryzen 5 7600X',
      gpu: 'RTX 4070',
      ram: '32GB DDR5',
      ssd: '1TB NVMe',
      motherboard: 'B650',
      psu: '750W',
      case: 'ATX Tower'
    }
  },
  'CS2': {
    '<25000': {
      cpu: 'Ryzen 3 7100F',
      gpu: 'GTX 1650',
      ram: '16GB DDR5',
      ssd: '512GB NVMe',
      motherboard: 'B550M',
      psu: '500W',
      case: 'Mid-Tower'
    },
    '25000-40000': {
      cpu: 'Ryzen 5 5500',
      gpu: 'RTX 3060',
      ram: '16GB DDR5',
      ssd: '512GB NVMe',
      motherboard: 'B550',
      psu: '550W',
      case: 'Mid-Tower'
    },
    '40000-60000': {
      cpu: 'Ryzen 5 7500F',
      gpu: 'RTX 4060',
      ram: '32GB DDR5',
      ssd: '1TB NVMe',
      motherboard: 'B650M',
      psu: '650W',
      case: 'Mid-Tower'
    },
    '60000+': {
      cpu: 'Ryzen 7 7700X',
      gpu: 'RTX 4070',
      ram: '32GB DDR5',
      ssd: '1TB NVMe',
      motherboard: 'B850',
      psu: '750W',
      case: 'ATX Tower'
    }
  },
  'Minecraft': {
    '<20000': {
      cpu: 'Ryzen 3 3100F',
      gpu: 'GTX 1050',
      ram: '8GB DDR4',
      ssd: '256GB SSD',
      motherboard: 'B450M',
      psu: '450W',
      case: 'Mini-Tower'
    },
    '20000-35000': {
      cpu: 'Ryzen 5 3600',
      gpu: 'RTX 2060',
      ram: '16GB DDR4',
      ssd: '512GB SSD',
      motherboard: 'B550M',
      psu: '550W',
      case: 'Mid-Tower'
    },
    '35000-60000': {
      cpu: 'Ryzen 5 5600X',
      gpu: 'RTX 3070',
      ram: '32GB DDR5',
      ssd: '1TB NVMe',
      motherboard: 'B650M',
      psu: '750W',
      case: 'Mid-Tower'
    },
    '60000+': {
      cpu: 'Ryzen 7 7700X',
      gpu: 'RTX 4070 Ti',
      ram: '32GB DDR5',
      ssd: '2TB NVMe',
      motherboard: 'B850',
      psu: '850W',
      case: 'ATX Tower'
    }
  },
  'Fortnite': {
    '<25000': {
      cpu: 'Ryzen 3 7100F',
      gpu: 'GTX 1650',
      ram: '16GB DDR5',
      ssd: '512GB NVMe',
      motherboard: 'B550M',
      psu: '500W',
      case: 'Mid-Tower'
    },
    '25000-45000': {
      cpu: 'Ryzen 5 5600X',
      gpu: 'RTX 3060 Ti',
      ram: '16GB DDR5',
      ssd: '512GB NVMe',
      motherboard: 'B550',
      psu: '650W',
      case: 'Mid-Tower'
    },
    '45000-70000': {
      cpu: 'Ryzen 5 7600X',
      gpu: 'RTX 4070',
      ram: '32GB DDR5',
      ssd: '1TB NVMe',
      motherboard: 'B650',
      psu: '750W',
      case: 'Mid-Tower'
    },
    '70000+': {
      cpu: 'Ryzen 7 7700X',
      gpu: 'RTX 4070 Ti',
      ram: '32GB DDR5',
      ssd: '1TB NVMe',
      motherboard: 'B850',
      psu: '850W',
      case: 'ATX Tower'
    }
  },
  'GTA V': {
    '<30000': {
      cpu: 'Ryzen 3 7100F',
      gpu: 'RTX 3060',
      ram: '16GB DDR5',
      ssd: '512GB NVMe',
      motherboard: 'B550',
      psu: '550W',
      case: 'Mid-Tower'
    },
    '30000-50000': {
      cpu: 'Ryzen 5 5600X',
      gpu: 'RTX 3070',
      ram: '16GB DDR5',
      ssd: '512GB NVMe',
      motherboard: 'B550',
      psu: '650W',
      case: 'Mid-Tower'
    },
    '50000-75000': {
      cpu: 'Ryzen 5 7600X',
      gpu: 'RTX 4070',
      ram: '32GB DDR5',
      ssd: '1TB NVMe',
      motherboard: 'B650',
      psu: '750W',
      case: 'Mid-Tower'
    },
    '75000+': {
      cpu: 'Ryzen 7 7700X',
      gpu: 'RTX 4090',
      ram: '32GB DDR5',
      ssd: '2TB NVMe',
      motherboard: 'B850',
      psu: '1000W',
      case: 'ATX Tower'
    }
  },
  'Red Dead Redemption 2': {
    '<40000': {
      cpu: 'Ryzen 5 5600X',
      gpu: 'RTX 3070',
      ram: '32GB DDR5',
      ssd: '1TB NVMe',
      motherboard: 'B550',
      psu: '650W',
      case: 'Mid-Tower'
    },
    '40000-70000': {
      cpu: 'Ryzen 5 7600X',
      gpu: 'RTX 4070',
      ram: '32GB DDR5',
      ssd: '1TB NVMe',
      motherboard: 'B650',
      psu: '750W',
      case: 'Mid-Tower'
    },
    '70000-100000': {
      cpu: 'Ryzen 7 7700X',
      gpu: 'RTX 4070 Ti',
      ram: '32GB DDR5',
      ssd: '2TB NVMe',
      motherboard: 'B850',
      psu: '850W',
      case: 'ATX Tower'
    },
    '100000+': {
      cpu: 'Ryzen 7 9700X',
      gpu: 'RTX 4090',
      ram: '32GB DDR5',
      ssd: '2TB NVMe',
      motherboard: 'X870',
      psu: '1000W',
      case: 'ATX Tower'
    }
  },
  'EA SPORTS FC': {
    '<20000': {
      cpu: 'Ryzen 3 3100F',
      gpu: 'GTX 1050',
      ram: '8GB DDR4',
      ssd: '256GB SSD',
      motherboard: 'B450M',
      psu: '450W',
      case: 'Mini-Tower'
    },
    '20000-35000': {
      cpu: 'Ryzen 5 3600',
      gpu: 'RTX 2070',
      ram: '16GB DDR4',
      ssd: '512GB SSD',
      motherboard: 'B550M',
      psu: '550W',
      case: 'Mid-Tower'
    },
    '35000-60000': {
      cpu: 'Ryzen 5 7500F',
      gpu: 'RTX 4060',
      ram: '32GB DDR5',
      ssd: '1TB NVMe',
      motherboard: 'B650M',
      psu: '650W',
      case: 'Mid-Tower'
    },
    '60000+': {
      cpu: 'Ryzen 7 7700X',
      gpu: 'RTX 4070',
      ram: '32GB DDR5',
      ssd: '1TB NVMe',
      motherboard: 'B850',
      psu: '750W',
      case: 'ATX Tower'
    }
  },
  'Cyberpunk 2077': {
    '<50000': {
      cpu: 'Ryzen 5 5600X',
      gpu: 'RTX 3070 Ti',
      ram: '32GB DDR5',
      ssd: '1TB NVMe',
      motherboard: 'B550',
      psu: '750W',
      case: 'Mid-Tower'
    },
    '50000-80000': {
      cpu: 'Ryzen 5 7600X',
      gpu: 'RTX 4080',
      ram: '32GB DDR5',
      ssd: '2TB NVMe',
      motherboard: 'B650',
      psu: '850W',
      case: 'Mid-Tower'
    },
    '80000-120000': {
      cpu: 'Ryzen 7 7700X',
      gpu: 'RTX 4090',
      ram: '32GB DDR5',
      ssd: '2TB NVMe',
      motherboard: 'B850',
      psu: '1000W',
      case: 'ATX Tower'
    },
    '120000+': {
      cpu: 'Ryzen 7 9700X',
      gpu: 'RTX 4090',
      ram: '64GB DDR5',
      ssd: '2TB NVMe',
      motherboard: 'X870',
      psu: '1200W',
      case: 'ATX Tower'
    }
  }
};

// Reef API'den fiyat çek
async function getProductPrice(productName) {
  try {
    const response = await axios.get(REEF_API_URL, {
      params: { q: productName },
      headers: { Authorization: `Bearer ${REEF_API_KEY}` },
      timeout: 5000
    });

    if (response.data && response.data.data && response.data.data.length > 0) {
      const product = response.data.data[0];
      return {
        name: product.name || productName,
        price: product.price || 0,
        store: product.store || 'Bilinmiyor',
        url: product.url || '#'
      };
    }
    
    return {
      name: productName,
      price: 0,
      store: 'Fiyat bulunamadı',
      url: '#'
    };
  } catch (error) {
    console.error(`Reef API Error (${productName}):`, error.message);
    return {
      name: productName,
      price: 0,
      store: 'API Hatası',
      url: '#'
    };
  }
}

// Bütçe aralığını belirle
function getBudgetRange(budget) {
  if (budget < 25000) return '<25000';
  if (budget < 40000) return '25000-40000';
  if (budget < 60000) return '40000-60000';
  if (budget < 75000) return '60000-75000';
  if (budget < 100000) return '75000-100000';
  if (budget < 120000) return '100000-120000';
  return '120000+';
}

client.once('ready', () => {
  console.log(`✅ Bot giriş yaptı: ${client.user.tag}`);
  
  // Slash command kaydet
  client.application.commands.create({
    name: 'pctopla',
    description: 'Discord PC Toplama Botu - Reef API ile Fiyat Çekme',
  }).catch(err => console.error('Komut kayıt hatası:', err));
});

client.on('interactionCreate', async (interaction) => {
  try {
    // /pctopla command
    if (interaction.isCommand() && interaction.commandName === 'pctopla') {
      const userId = interaction.user.id;
      
      userSessions[userId] = {
        budget: null,
        game: null,
        cpu: null,
        gpu: null
      };

      const embed = new EmbedBuilder()
        .setColor('#1f1f1f')
        .setTitle('🖥️ PC TOPLAMA PANELİ')
        .setDescription('Aşağıdaki seçenekleri kullanarak hayalinizdeki PC\'yi konfigüre edin.')
        .addFields(
          { name: '💰 Bütçe', value: 'Henüz seçilmedi', inline: true },
          { name: '🎮 Oyun', value: 'Henüz seçilmedi', inline: true },
          { name: '🧠 CPU Markası', value: 'Henüz seçilmedi', inline: true },
          { name: '🎮 GPU Markası', value: 'Henüz seçilmedi', inline: true }
        )
        .setFooter({ text: 'Tüm seçimleri tamamladıktan sonra "PC\'yi Oluştur" butonuna basın' });

      const budgetButton = new ButtonBuilder()
        .setCustomId('budget_button')
        .setLabel('💰 Bütçe: 75000 TL')
        .setStyle(ButtonStyle.Primary);

      const gameSelect = new StringSelectMenuBuilder()
        .setCustomId('game_select')
        .setPlaceholder('🎮 Oyun seçin')
        .addOptions(
          OYUNLAR.map(oyun => ({
            label: oyun,
            value: oyun
          }))
        );

      const cpuSelect = new StringSelectMenuBuilder()
        .setCustomId('cpu_select')
        .setPlaceholder('🧠 CPU Markası')
        .addOptions(
          CPULAR.map(cpu => ({
            label: cpu,
            value: cpu
          }))
        );

      const gpuSelect = new StringSelectMenuBuilder()
        .setCustomId('gpu_select')
        .setPlaceholder('🎮 GPU Markası')
        .addOptions(
          GPULAR.map(gpu => ({
            label: gpu,
            value: gpu
          }))
        );

      const buildButton = new ButtonBuilder()
        .setCustomId('build_button')
        .setLabel('🚀 PC\'yi Oluştur')
        .setStyle(ButtonStyle.Success);

      const row1 = new ActionRowBuilder().addComponents(budgetButton);
      const row2 = new ActionRowBuilder().addComponents(gameSelect);
      const row3 = new ActionRowBuilder().addComponents(cpuSelect);
      const row4 = new ActionRowBuilder().addComponents(gpuSelect);
      const row5 = new ActionRowBuilder().addComponents(buildButton);

      await interaction.reply({ embeds: [embed], components: [row1, row2, row3, row4, row5], ephemeral: false });
    }

    // Bütçe Button
    if (interaction.isButton() && interaction.customId === 'budget_button') {
      const userId = interaction.user.id;
      userSessions[userId].budget = 75000; // Default 75000, ileriye kullanıcı input'u eklenebilir
      
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setDescription(`✅ Bütçeniz: **75.000 TL** olarak ayarlandı.`);
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Oyun Seçimi
    if (interaction.isStringSelectMenu() && interaction.customId === 'game_select') {
      const userId = interaction.user.id;
      const game = interaction.values[0];
      userSessions[userId].game = game;

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setDescription(`✅ Oyun: **${game}** olarak seçildi.`);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // CPU Seçimi
    if (interaction.isStringSelectMenu() && interaction.customId === 'cpu_select') {
      const userId = interaction.user.id;
      const cpu = interaction.values[0];
      userSessions[userId].cpu = cpu;

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setDescription(`✅ CPU Markası: **${cpu}** olarak seçildi.`);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // GPU Seçimi
    if (interaction.isStringSelectMenu() && interaction.customId === 'gpu_select') {
      const userId = interaction.user.id;
      const gpu = interaction.values[0];
      userSessions[userId].gpu = gpu;

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setDescription(`✅ GPU Markası: **${gpu}** olarak seçildi.`);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // PC Oluştur
    if (interaction.isButton() && interaction.customId === 'build_button') {
      const userId = interaction.user.id;
      const session = userSessions[userId];

      // Validasyon
      if (!session.budget || !session.game || !session.cpu || !session.gpu) {
        return await interaction.reply({
          content: '❌ Lütfen tüm seçimleri tamamlayın',
          ephemeral: true
        });
      }

      // Status
      const statusEmbed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('⏳ PC Yapılandırılıyor...')
        .setDescription('Fiyatlar Reef API\'den çekiliyor...');

      await interaction.reply({ embeds: [statusEmbed] });

      try {
        // Config al
        const budgetRange = getBudgetRange(session.budget);
        const gameConfigs = PC_CONFIGS[session.game];
        
        if (!gameConfigs) {
          return await interaction.editReply({
            embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('❌ Bu oyun için konfigürasyon bulunamadı')]
          });
        }

        const config = gameConfigs[budgetRange];
        
        if (!config) {
          return await interaction.editReply({
            embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('❌ Bu bütçe aralığı için konfigürasyon bulunamadı')]
          });
        }

        // Reef API'den fiyatları çek
        const prices = await Promise.all([
          getProductPrice(config.cpu),
          getProductPrice(config.gpu),
          getProductPrice(config.ram),
          getProductPrice(config.ssd),
          getProductPrice(config.motherboard),
          getProductPrice(config.psu),
          getProductPrice(config.case)
        ]);

        const [cpuPrice, gpuPrice, ramPrice, ssdPrice, mbPrice, psuPrice, casePrice] = prices;

        const total = cpuPrice.price + gpuPrice.price + ramPrice.price + ssdPrice.price + mbPrice.price + psuPrice.price + casePrice.price;
        const remaining = session.budget - total;

        // Embed oluştur
        const resultEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('🖥️ PC HAZIR!')
          .addFields(
            { name: '🎮 Oyun', value: session.game, inline: false },
            { name: '💰 Bütçe', value: `${session.budget.toLocaleString('tr-TR')} TL`, inline: false },
            { name: '\u200B', value: '\u200B' },
            { name: '🧠 İşlemci', value: `**${cpuPrice.name}**\n${cpuPrice.price.toLocaleString('tr-TR')} TL\n🏪 ${cpuPrice.store}`, inline: false },
            { name: '🎮 Ekran Kartı', value: `**${gpuPrice.name}**\n${gpuPrice.price.toLocaleString('tr-TR')} TL\n🏪 ${gpuPrice.store}`, inline: false },
            { name: '🧩 RAM', value: `**${ramPrice.name}**\n${ramPrice.price.toLocaleString('tr-TR')} TL\n🏪 ${ramPrice.store}`, inline: false },
            { name: '💾 SSD', value: `**${ssdPrice.name}**\n${ssdPrice.price.toLocaleString('tr-TR')} TL\n🏪 ${ssdPrice.store}`, inline: false },
            { name: '🔧 Anakart', value: `**${mbPrice.name}**\n${mbPrice.price.toLocaleString('tr-TR')} TL\n🏪 ${mbPrice.store}`, inline: false },
            { name: '⚡ Güç Kaynağı', value: `**${psuPrice.name}**\n${psuPrice.price.toLocaleString('tr-TR')} TL\n🏪 ${psuPrice.store}`, inline: false },
            { name: '📦 Kasa', value: `**${casePrice.name}**\n${casePrice.price.toLocaleString('tr-TR')} TL\n🏪 ${casePrice.store}`, inline: false },
            { name: '\u200B', value: '\u200B' },
            { name: '💰 TOPLAM', value: `**${total.toLocaleString('tr-TR')} TL**`, inline: true },
            { name: '🟢 KALAN', value: `**${remaining.toLocaleString('tr-TR')} TL**`, inline: true }
          );

        if (session.budget >= 120000) {
          resultEmbed.setFooter({ text: '💎 120K+ bütçe açıldı. Ekran kartı artık sistemin patronu!' });
        } else {
          resultEmbed.setFooter({ text: 'Başarılı bir PC yapılandırması oluşturuldu!' });
        }

        await interaction.editReply({ embeds: [resultEmbed] });

      } catch (error) {
        console.error('PC Oluşturma Hatası:', error);
        await interaction.editReply({
          embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('❌ Hata').setDescription('PC yapılandırılırken bir hata oluştu.')]
        });
      }
    }

  } catch (error) {
    console.error('Interaction Error:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);
