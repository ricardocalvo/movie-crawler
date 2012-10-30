var events = require('events'),
    path = require('path'),
    fs = require('promised-io/fs'),
    Deferred = require("promised-io/promise"),
    http = require("http"),
    jsdom = require("jsdom"),
    poolModule = require('generic-pool'),
    $ = require('jquery'),
    request = require('request'),
    commander = require('commander');

//require('v8-profiler');

///////////////////////////////
// PATH DE DEFINICOES
///////////////////////////////
// path
var listDefinitionRootPath = path.normalize("./../input/list.json");
///////////////////////////////
var resultDefinitionRootPath = path.normalize("./../result/list.json");
///////////////////////////////
///////////////////////////////



/**
 *  Singleton
 *
 *
 */
var Crawler = (function(){

  //Variables
  var list = null;
  var nList = [];

  var filmes = {
    filmes : []
  };

  var idparsed = [];
  var maxCount = 0;
  var maxDeph = 3;

  /**
   * API.
   * Metodo para compilar coisinhas
   * @param {Array} xxxxxxxxxxxxxxxxxxx
   */
  var load = function(oURL) {
      var dfd = new $.Deferred();
      console.log("Iniciando Crawler... URL: " + oURL);

      //Variables
      var oResult = null;
      var config = {};

      //console.log(typeof oURL);

      if(typeof oURL == 'string'){
        list = oURL.split(",");
      }else{
        list = oURL;
      }

      console.log("================================================ ");
      for (var i = list.length - 1; i >= 0; i--) {
        console.log(i + ": " + list[i]);
      };
      console.log("================================================ ");

      var j = 0;
      var cb = function(_list){
        j++;
        list = _list;
        run(cb, j);
      };
      run(cb, j);
  };

  var reload = function(){
      console.log("recarregando lista... ");


      data = fs.readFileSync('/Users/Ricardo/Projects/NodeJs/movie-crawler/result/resultado.txt', encoding='utf8');
      filmes = JSON.parse(data);
      console.log(filmes);

      data = fs.readFileSync('/Users/Ricardo/Projects/NodeJs/movie-crawler/result/_interruption_moment.txt', encoding='utf8');
      _obj = JSON.parse(data);
      console.log(_obj.thisList.length + " - " + _obj.newlist.length);

      list = _obj.thisList;
      nList = _obj.newlist;
      maxCount = _obj.maxCount -1;

      console.log("========================================== ... ");

      load(list);
  };


  var loadList = function(oURL, cb) {
      console.log("Iniciando Crawler... ListURL: " + oURL);

      var config = {
        host: oURL,
        port: 80,
        path: '/',
        method: 'GET'
      };
      mountList(config, cb);
  };

  var run = function(cb, qName){
    var q = $({});
    var opt = null;

    //Incrementa para indicar que rodou +1 nível;
    maxCount++;
    console.log("==> Profundidade da busca:" + maxCount);

      for (var i = 0; i < list.length; i++) {
            if(list[list.length-1].length > 9){
              pref = "";
            }else{
              pref = "http://www.imdb.com/title/"
            }
                                                                console.log("Push [" + i + "]: " + pref + list[i] + "");
          
          q.queue('parseMovie'+ qName, function(next){

            //console.log(idparsed.indexOf(list[i]));
            //console.log("" + JSON.stringify(list) + " ==> " + JSON.stringify(idparsed) + " : " + list[list.length - 1] + "  -->  " + idparsed.indexOf(list[list.length - 1]));

            if(idparsed.indexOf(list[list.length - 1]) == -1){
              readPage({
                host: pref + list[list.length - 1],
                port: 80,
                path: '/',
                method: 'GET'
              })
              .done(function(data, recomender){
                //oResult = this.parse(body);

                console.log("Recomendações encontradas:                     " + recomender.length);
                console.log("Restam para serem parseados neste momento:     " + list.length);
                console.log("Quantidade de Filmes para proxima lista:       " + (nList.length + recomender.length));

                // save();
                // verifyNeedMore().add();
                if(recomender.length > 0){
                  for (var i = 0; i < recomender.length; i++) {
                      nList.push(recomender[i]);
                  };
                  
                }
                
                list.pop();


                //cria momento de backup para continuar caso tenha falhado;
                var im = {
                  "maxCount" : maxCount,
                  "thisList" : list,
                  "newlist" : nList
                };
                FileManager.save("/Users/Ricardo/Projects/NodeJs/movie-crawler/result/_interruption_moment.txt", JSON.stringify(im));



                if(list.length == 0){
                  q.clearQueue("parseMovie"+ qName);
                  if(nList.length > 0 && maxCount < maxDeph){
                    load(nList);
                    console.log("---------------------------> Nova lista carregada...");
                  }else{
                    FileManager.save("/Users/Ricardo/Projects/NodeJs/movie-crawler/result/resultado.txt", JSON.stringify(filmes));
                    console.log("======== > Finish < ========");
                  }
                }else{
                  FileManager.save("/Users/Ricardo/Projects/NodeJs/movie-crawler/result/resultado.txt", JSON.stringify(filmes));
                  q.dequeue("parseMovie"+ qName);
                }
                
              })
              .fail(function(error){
                list.pop();
                q.dequeue("parseMovie"+ qName);
                //return;
              });
            }else{
              console.log("Filme já paseado!");
              list.pop();
              q.dequeue("parseMovie"+ qName);
            }
          });
      };

      q.dequeue("parseMovie"+ qName);
  }


  var readPage = function(options){
    var dfd = new $.Deferred();


        // TODO:
        //
        // Fazer com que gere um PDF ou PNG a cada acesso, gravando em uma pasta de subdiretorio
        //    
        // page.open(options.host, function () {
        //   page.render(""+options.host);
        //   phantom.exit();
        // });

        request(options.host, function (error, response, body) {

          if (!error && response.statusCode == 200) {
            parsePage(body)
            .done(function(data, recomender){
              //console.log("parser DONE")
              dfd.resolve(data, recomender);
            })
            .fail(function(error){
              console.log("....... falha no parser REJECTED")
              dfd.reject(error);
            });

          }
        });
        return dfd.promise();
  }

  var parsePage = function(body){
      var dfd = new $.Deferred();

      //FileManager.save("/Users/Ricardo/Projects/NodeJs/Crawler/result/resultado.txt", body);

      var jsd = jsdom.env({
        html: body
      }, function (err, window) {
        var jq = $(window.document);

        var id      = jq.find('link[rel=canonical]').attr('href').trim();
        var url     = "";
        var filme   = jq.find('title').text().trim();
        var ano     = jq.find('h1 > span.nobr > a').text().trim();

        //genero
        var genero  = [];
        jq.find('div.infobar > a').each(function() {
          genero.push(jq.find(this).text().trim());
        });
        //diretor
        var diretor = [];
        jq.find('div.txt-block > a[itemprop=director]').each(function() {
          diretor.push(jq.find(this).text().trim());
        });
        //atores
        var atores = [];
        jq.find('div.txt-block > a[itemprop=actors]').each(function() {
          atores.push(jq.find(this).text().trim());
        });

        var rating = jq.find('span[itemprop=ratingValue]').text().trim();

        var country = "";
        jq.find('h4.inline').each(function(){
          if(jq.find(this).text().trim() == "Country:"){
            country = jq.find(this).next().text().trim();
          }
        });

        // jQuery is now loaded on the jsdom window created from 'agent.body'
        console.log("---------------------------------------------");
        console.log("Filme   :" + filme);
        //console.log("---------------------------------------------");

        objJson = {
          "id" : id.substr(26, 9),
          "url" : "http://www.imdb.com/title/" + id.substr(26, 9) + "/",
          "filme" : filme,
          "ano" :  ano,
          "genero" : genero,
          "diretor" : diretor,
          "atores" : atores,
          "rating" : rating,
          "country" : country,
          "recommendations" : []
        };

        loadRecommendation(objJson)
            .done(function(_objJson){
                // armazena todos objetos em um array de filmes
                filmes.filmes.push(_objJson);

                // guardar o id (url) do filme para não parsear repetido
                idparsed.push(_objJson.id);

                //console.log(_objJson.recommendations);

                FileManager.save("/Users/Ricardo/Projects/NodeJs/movie-crawler/result/page/" +_objJson.id+ ".txt", body);



                // devolve promessa passando lista de novos filmes para parsear
                dfd.resolve("Capturado tudo com sucesso!", _objJson.recommendations);
            })
            .fail(function(error){
              console.log("....... falha no loadRecommendation() --> " + errors);
              dfd.reject(error);
            });

      });

      return dfd.promise();
  }


  var loadRecommendation = function(_objJson){
      var dfd = new $.Deferred();

      $.post("http://www.imdb.com/widget/recommendations/_ajax/get_more_recs", 
          {
            count : 25,
            start : 0,
            specs : 'p13nsims:' + _objJson.id,
            caller_name : 'p13nsims-title'
          },
          function(data) {
            //console.log("TESTANDO AQUI ESTE MOMENTO");
            var _data = eval(data);
            for (var i = 0; i < _data.recommendations.length; i++) {
             _objJson.recommendations.push(_data.recommendations[i].tconst);
            };
          }
      ).success(function(){
        dfd.resolve(_objJson);
      }).error(function(){
        dfd.reject("Erro ao efetuar POST Ajax no Imdb");
      });


      return dfd.promise();
  }


  var mountList = function(options, cb){
    var _list = [];

        request(options.host, function (error, response, body) {

          if (!error && response.statusCode == 200) {
            jsdom.env({
              html: body,
              scripts: [
                'http://code.jquery.com/jquery-1.7.min.js'
              ]
            }, function (err, window) {
              var $ = window.jQuery;
              console.log("---------------------------------------------");

              var cont = 0;
              $('td > font > a[href^="/title/"]').each(function() {
                _list.push("http://www.imdb.com" + $(this).attr('href'));
                console.log(cont + " : http://www.imdb.com" + $(this).attr('href'));
                cont++;
              });

              console.log("---------------------------------------------");

              var _finallist = (_list.length > 0) ? _list : null;
              //console.log(_finallist);
              cb(_finallist);
            });


          }
        });


  }


  return {
    load : load,
    reload : reload,
    loadList : loadList,
    run : run,
    parse : parsePage,
    readPage : readPage,
  }
})();



/**
 * Singleton que se escarga de gestionar o acceso ao disco
 * 
 * @singleton
 * @constructor
 */
var FileManager = (function() {
  var cache = {};
  return {
    /**
     * Crea un directorio en el sistema de archivos 
     * 
     * TODO: hacerlo recursivo
     * 
     * @param {String}
     *            Path normalizado del directorio que se quiere crear
     * @returns {Deferred.promise}
     */
    createDirectory : function(folderPath) {
      var deferred = new Deferred.Deferred();
      path.exists(folderPath, function(exists) {
        if (!exists) {
          fs.mkdir(folderPath).then(
            deferred.resolve, 
            function (e){
              deferred.reject(new Fail("Não foi possível criar o diretório " + folderPath + ": "+ e));
            }
          );
        } else {
          deferred.resolve();
        }
      });
      return deferred.promise;
    },
    /**
     * Carga los contenidos de un archivo
     * 
     * @param {String}
     *            filePath La ruta normallizad hasta el archivo a cargar
     * @returns {Deferred.promise} Resuelve con el contenido del archivo
     *          (utf8)
     */
    load : function(filePath) {
      var deferred = new Deferred.Deferred();
      path.exists(filePath, function (exists){
        if (exists){
          fs.readFile(filePath, 'utf8').then(
            function (contents){
              deferred.resolve(contents.toString());
            },
            function (e){
              deferred.reject(new Fail("Não foi possível ler o arquivo "+ filePath + ": " + e));
            }
          );
        }
        else {
          deferred.reject(new Fail("Não existe o arquivo "+filePath)) ;
        }
      });
      return deferred.promise;
    },
    /**
     * Guarda un contenido en un archivo, creando si fuera necesario 
     * la ruta hasta el archivo
     * 
     * @param {String}
     *            filePath La ruta donde guardar el archivo
     * @param {String}
     *            contents El contenido del archivo
     * @returns {Deferred.promise}
     */
    save : function(filePath, contents) {
      var deferred = new Deferred.Deferred();
      this.createDirectory(path.dirname(filePath)).then(
        function () {
          fs.writeFile(filePath, contents).then(
            deferred.resolve, 
            function (e) { 
              deferred.reject(new Fail ("Não foi possível escrever no arquivo " +filePath + ": " +e));
            }
          );
        },
        function (fail) {
          deferred.reject(fail.add("Não foi possível gravar o arquivo no caminho "  +filePath));
        }
      );
      return deferred.promise;
    }
  }
})();

/** ************************************************************************************************* */



////////////////////////////
// Public Methods
////////////////////////////
module.exports.load = Crawler.load;
module.exports.reload = Crawler.reload;
module.exports.loadList = Crawler.loadList;

