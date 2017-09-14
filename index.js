var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var redis = require('redis');

var app = express();

var clienteRedis = redis.createClient(11249, 'redis-11249.c10.us-east-1-3.ec2.cloud.redislabs.com', {no_ready_check: true});

clienteRedis.auth('password', function(err) { 
    if (err) throw err;
});

clienteRedis.on('connect', function () {
    console.log('Servidor Redis Conectado ...');
});

// Configuração do Renderizador de Páginas (EJS)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Captura o caminho '/' na URL
app.get('/', function (req, res) {
    var titulo = 'Dados em Cache';

        clienteRedis.lrange('dados', 0, -1, function (err, dados) {
            clienteRedis.hgetall('contato', function(err, contato){
                res.render('cache', {
                    titulo: titulo,
                    dados: dados,
                    contato: contato
                });
            });
    });
});

app.post('/cache/cacheValue', function(req, res) {
    var dado = req.body.dado;

    clienteRedis.rpush('dados', dado, function(err, reply) {
        if (err) {
            console.log(err);
        }

        console.log('Valor incluido no cache.');
        res.redirect('/');
    });
});

app.post('/contato/editar', function(req, res) {
	var contato = {};

	contato.nome = req.body.nome;
	contato.companhia = req.body.companhia;
	contato.telefone = req.body.telefone;

	clienteRedis.hmset('contato', 
	         ['nome', contato.nome,
			  'companhia', contato.companhia, 
			  'telefone', contato.telefone], 
			  function(err, reply){
		if(err){
			console.log(err);
		}
		console.log(reply);
		res.redirect('/');
	});
});

app.post('/cache/uncacheValue', function(req, res) {
    var valuesToUncache = req.body.valuesToUncache;

    if (valuesToUncache && valuesToUncache.length > 0) {
        clienteRedis.lrange('dados', 0, -1, function(err, dados) {
            for (var posicao = 0; posicao < dados.length; posicao++) {
                if (valuesToUncache.indexOf(dados[posicao]) > -1) {
                    clienteRedis.lrem('dados', 0, dados[posicao], function(err) {
                        if (err) {
                            console.log(err);
                        }
                    });
                }
            }
    
        });
    }

    res.redirect("/");
});

app.set('port', (process.env.PORT || 5000));
app.listen(app.get('port'), function() {
    console.log('Servidor Inicializado na Porta', app.get('port'));
});

module.exports = app;