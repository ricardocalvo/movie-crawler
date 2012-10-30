/**
 * main script
 * Usage: TODO
 */

// Node dependencies
var commander = require('commander'),
	crawler = require('./lib/parser.js');

var isCommand = false;

commander
	.version('0.1.0')
	.option('-u, --url [url,url,...]', 
			'Specify the URL to look on the web and parser:', 
			String, 
			"all");
commander
	.version('0.1.0')
	.option('-l, --list [list,list,...]', 
			'Specify the URL witch has the list to create a parser list:', 
			String, 
			"all");
commander
	.version('0.1.0')
	.option('-r, --rest [rest,rest,...]', 
			'Continuous the list remaining parser:', 
			String, 
			"none");
commander
	.command('parse')
	.description("Parse URL")
	.action(function () {
		console.log("\nThe available URL are:")
	});
	
commander.parse(process.argv);


if (!isCommand){

	var list = null;
	var url = (commander.url == "all") ? "" : commander.url;


	if (commander.url != "all"){
		console.log('Compilação iniciada... ALVO: ' + url);
		crawler.load(url);
	}
	else {
		if(commander.rest == "all"){
			console.log("iniciando recarregamento...");
			crawler.reload();
			process.stdin.destroy();
		}else{
			if(commander.list != "all"){
				console.log("Montar lista de URL a partir de: " + commander.list);

				crawler.loadList(commander.list, function(_list){
						if(_list != null){
							commander.confirm("Buscar informações a partir de todas URLs? [y/n] ", function (seguro){
								if (seguro){
									crawler.load(_list);
								}else{
									console.log("Fim da execução!");
								}
								process.stdin.destroy();
							});
						}else{
						 	console.log("Não há lista para varredura!");
						}
				});
				

			}else{
				console.log("Não há varredura!");
			}
		}
	}
}

