const WebSocket = require("ws")
const fs = require("fs");
const EventEmitter = require('events');
const { default: axios } = require("axios");
const pack = (d) => JSON.stringify(d);
const twvoucher = require('@fortune-inc/tw-voucher')
const unpack = (d) => JSON.parse(d);
var token = fs.readFileSync('tokens.txt').toString().split("\r\n")
const config = require("./config.json")
const phone = config.phone
const webhook = config.webhook

class Client extends EventEmitter {
    constructor() {
        super();
        this.ws = null;
        this.token = null;
        this.user = {}
        this.on("READY", (data) => {
            this.user = data.user
        })
    }
    login(token) {
        this.token = token
        this.ws = new WebSocket("wss://gateway.discord.gg/?encoding=json&v=9&compress=json")
        this.ws.on('open', () => {
            this.send({
                "op": 2,
                "d": {
                    "token": this.token,
                    "properties": {
                        "$os": "windows",
                        "$browser": "Discord",
                        "$device": "desktop"
                    }
                }
            })
        })
        this.ws.on("message", (msg) => {
            msg = unpack(msg)
            //console.log(msg)
            if(msg.op === 10){
                setInterval(() => {
                    this.send({
                        "op": 1,
                        "d": null
                    })
                }, msg.d.heartbeat_interval);
            }
            if(msg.op === 0){
                this.emit(msg.t, msg.d)
            }

        })
        this.ws.on("close", () => {

        })
    }
    send(msg) {
        this.ws.send(pack(msg))
    }
}
for (i in token) {
    const bot = new Client();
    var userclient = []
    bot.on("READY", () => {
        
        //console.log(bot.user.username)
    })
    
    bot.on("MESSAGE_CREATE", (message) => {
        
        if(message.content.includes("https://gift.truemoney.com/campaign/?v=")){
        const code = message.content.split("?v=")[1]
        
        twvoucher(phone, code).then(redeemed => {
            console.log(`[ ${new Date().toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1")} ] ${message.content}`)
            axios({
                method: "POST",
                url: webhook,
                data: {
                    "embeds": [
                        {
                          "description": `\`\`\`จำนวนเงิน: ${redeemed.amount}\nคนสร้างซอง: ${redeemed.owner_full_name}\nลิงค์ซอง: ${message.content}\n\nไอดีคนส่งลิงค์: ${message.author.id}\nไอดีเซิฟที่ส่งลิงค์: ${message.guild_id}\nไอดีห้องที่ส่งลิงค์: ${message.channel_id}\`\`\``,
                          "color": 65300
                        }
                      ]
                }
            }).catch(e => console.log(e))
        }).catch(err => {
            console.log(`[ ${new Date().toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1")} ] ${message.content}`)
            var serverid = (message.guild_id)? message.guild_id: (!message.guild_id)? "แชทDM":""
            axios({
                method: "POST",
                url: webhook,
                data: {
                    "embeds": [
                        {
                          "description": `\`\`\`จำนวนเงิน: รับไม่ทัน\nคนสร้างซอง: ไม่ทราบ\nลิงค์ซอง: ${message.content}\n\nไอดีคนส่งลิงค์: ${message.author.id}\nไอดีเซิฟที่ส่งลิงค์: ${serverid}\nไอดีห้องที่ส่งลิงค์: ${message.channel_id}\`\`\``,
                          "color": 16711680
                        }
                      ]
                }
            }).catch(e => console.log(e))
        })
      }else{
        console.log(`[ ${new Date().toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1")} ] NO`)
      }
    })
bot.login(token[i])
}
