module.exports = {
    name: "die",
    aliases: [],
    category: "Infos",
    utilisation: "{prefix} dice",
  
    execute(client, message, args) {
      
      
      function thing() {
        console.log("sleep")
      }
      
      if (message.author.id === "760245527576313898"){
        message.channel.send("No!, this is was you get for killing me")
      } else {
      message.channel.send("deding")
      setTimeout(function(){ client.destroy();}, 1000)
      
    }},
  };
  