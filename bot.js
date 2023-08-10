import { Client, Intents, MessageEmbed } from 'discord.js';
import axios from 'axios';
import fs from 'fs'

function isValidUUID(s) {
  // const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  // return uuidPattern.test(s);
  return true
}

function isValidUser(interaction, valid_role) {
  return (role_ids.includes(interaction.user.id) || interaction.member?.roles?.cache.some((role) => role.id == valid_role) )
}

let keys = {
  day: [],
  week: [],
  month: []
}

const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]  });

const TOKEN = process.env.token;
const viewer_role = '1132451439516602408' 
const gen_role = '1132451143671357541'
const store_role = '1132451032589410374'
const role_ids = ["354005261976862720", "931619569502650368"]

client.once('ready',async  () => {
  console.log(`Logged in as ${client.user.tag}`);
  // const existingCommands = await client.api.applications(client.user.id).commands.get()
  // const commandIds = existingCommands.map((command) => command.id);
  // client.api.applications(client.user.id).commands.delete(commandIds)

  client.api.applications(client.user.id).commands.post({data: {name: "keys", description: "get all keys"}})
  client.api.applications(client.user.id).commands.post({
    data: {
      name: "storekeys",
      description: 'store keys here',
      options: [
        {
          type: 3, // Type 3 refers to a dropdown parameter
          name: 'category',
          description: 'choose how long the key should be valid',
          required: true,
          choices: [
            {
              name: 'day',
              value: 'day',
            },
            {
              name: 'week',
              value: 'week',
            },
            {
              name: 'month',
              value: 'month',
            }
            // Add more choices as needed
          ],
        }, 
        {
          type: 11, // Type 6 refers to a file parameter
            name: 'key-file',
            description: 'insert the file with all the keys to be added',
            required: true,
        }
      ]
    },
  });
  client.api.applications(client.user.id).commands.post({
    data: {
      name: "genkey",
      description: 'generate keys here',
      options: [
        {
          type: 3, // Type 3 refers to a dropdown parameter
          name: 'category',
          description: 'choose how long the key should be valid',
          required: true,
          choices: [
            {
              name: 'day',
              value: 'day',
            },
            {
              name: 'week',
              value: 'week',
            },
            {
              name: 'month',
              value: 'month',
            }
            // Add more choices as needed
          ],
        }, 
        {
          type: 4, // Type 3 refers to a dropdown parameter
          name: 'quantity',
          description: 'choose how many keys should be sent',
          required: true
        }
      ]
    },
  });
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;
  keys = JSON.parse(fs.readFileSync('keys.json'))
  const { commandName, options } = interaction;
  const embedMessage = new MessageEmbed()
  .setColor('#BB30A4')
  .setAuthor({name: "Key-Bot", iconURL: 'https://i.imgur.com/ap5xOKw.jpeg'})
  let message = ""
  
  if (commandName === "storekeys") {
    if (!isValidUser(interaction, store_role)) {
      await interaction.reply('You do not have permission to use this command.');
      return;
    }
    const dropdownValue = options.getString('category');
    const attachment = options.getAttachment('key-file');
    const response = await axios.get(attachment.url, { responseType: 'string' });
    const fileContent = response.data
    const file_keys = fileContent.split("\n")
    const stored = []
    for (let el of file_keys) {
      el = el.replace('\r', '')
      if (isValidUUID(el) && !keys.day.includes(el) && !keys.week.includes(el) && !keys.month.includes(el)) {
        switch (dropdownValue) {
          case "day": 
            keys.day.push(el)
            break
          case "week":
            keys.week.push(el)
            break
          case "month":
            keys.month.push(el)
            break
        }
        stored.push(el)
      } else {
        console.log(`${el} is no uuid or already existing`)
      }
    }
   

    // Now you can use the dropdownValue and file as you need
    // For example, reply to the user with their chosen dropdown value and the uploaded file
    message = `Added to '${dropdownValue}': ${stored.length} keys`
    embedMessage.setTitle('Stored Keys')

  }
  if (commandName === "keys") {
    if (!isValidUser(interaction, viewer_role)) {
      await interaction.reply('You do not have permission to use this command.');
      return;
    }
    embedMessage.setTitle('Available keys')
    message = `**DAYS:**\n${keys.day.length}\n**WEEKS:**\n${keys.week.length}\n**MONTHS:**\n${keys.month.length}`
  }
  if (commandName === "genkey") {
    if (!isValidUser(interaction, gen_role)) {
      await interaction.reply('You do not have permission to use this command.');
      return;
    }
    const dropdownValue = options.getString('category');
    let sendable = []
    if (keys[dropdownValue].length < options.getInteger('quantity')) {
      await interaction.reply(`Not enough keys availible, create new to execute the command!`)
      return
    }
    for (let i = 0; i < options.getInteger('quantity'); i++) {
      sendable.push(keys[dropdownValue].pop())
    } 
    message = `${sendable.join("\n")}`
    embedMessage.setTitle('Generated Keys')
  }
  embedMessage.setDescription(message)
  await interaction.reply({embeds: [embedMessage]});
  fs.writeFileSync('keys.json', JSON.stringify(keys, null, 2))
});

client.login(TOKEN);
