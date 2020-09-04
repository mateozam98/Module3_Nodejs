const express = require('express');
const morgan = require('morgan');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const passport = require('./config/passport');
const session = require('express-session');
const jwt = require('jsonwebtoken');



const Usuario = require('./models/usuario');
const Token = require('./models/token');

const store = new session.MemoryStore;

const app = express();

app.use(session({
    cookie: { maxAge: 240*60*60*1000},
    store: store,
    saveUninitialized: true,
    resave: true,
    secret: '?aU&#jY<g]h"*gY%~Wnvd[Ag"N:G%~)Bq+MN)Y>RFgme%rF'
}));

const mongoDB = 'mongodb://localhost/red_bicicletas';

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);

mongoose.connect(mongoDB);
const db = mongoose.connection;
db.on('error',console.error.bind(console,'MongoDb connection error'));
db.once('open', function(){
    console.log("-- App connected to Mongo --");
});


const indexRouter = require('./routes/index');
const bicicletasRouter = require('./routes/bicicletas');
const bicicletasAPIRouter = require('./routes/api/bicicletas');
const usuariosAPIRouter = require('./routes/api/usuarios');
const usuariosRouter = require('./routes/usuarios');
const tokenRouter = require('./routes/token');

const authAPIRouter = require('./routes/api/auth');

const Bicicleta = require('./models/bicicleta');

const { getMaxListeners, nextTick } = require('process');

// settings
app.set('port', process.env.PORT || 3000);
app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');
app.set('secretKey','r@hn2,>wDK}jyW');

// middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(morgan('dev'));
app.use(express.static(__dirname + '/public'));

app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());

// Rutas para Login, Logout y reseteo password

app.get('/login',function(req,res){
    res.render('session/login',{info:''}); 
});

app.post('/login',function(req,res,next){
    passport.authenticate('local', function(err, usuario, info){
        if (err) return next(err);
        if (!usuario) return res.render('session/login',{info});
        req.login(usuario, function(err){
            if (err) return next(err);
            return res.redirect('/');
        });
    })(req,res,next);
});

app.get('/logout',function(req,res){
    req.logout();
    res.redirect('/');
});

app.get('/forgotPassword',function(req,res){
    console.log('forgot Password - GET');
    console.log('Password Olvidada');
    res.render('session/forgotPassword',{info:''});
    
});

app.post('/forgotPassword',function(req,res){
    console.log('forgot Password - POST');
    console.log('Usuario:');
    console.log(req.body.email);
    Usuario.findOne({email: req.body.email}, function (err,usuario){
        console.log(usuario);
        if (!usuario) return res.render('session/forgotPassword', 
        {info: {message:'No existe el email para un usuario existente'}});
            
            usuario.resetPassword(function(err){
                if (err) return next(err);
                console.log('session/forgotPasswordMessage');
            });

            res.render('session/forgotPasswordMessage');
    })
});

app.get('/resetPassword/:token', function(req,res,next){
    Token.findOne({token: req.params.token}, function(err,token){
        if (!token) return res.status(400).send({ type: 'not-verified',
            msg:'No existe un usuario asociado al token.  Verifique que su token no haya expirado'});

            Usuario.findById(token._userId, function(err,usuario){
                if (!usuario) return res.status(400).send({msg: 'No existe un usuario asociado al token.'});
                res.render('session/resetPassword',{errors:{},usuario:usuario, confirm_password:''});
            });
    });
});

app.post('/resetPassword', function( req,res ){
	if(req.body.password != req.body.confirm_password){
        res.render('session/resetPassword', {errors:{confirm_password: {message: 'No coincide con el password ingresado'}},
        usuario: new Usuario({email: req.body.email}),confirm_password:''});
		return;
	    }

	Usuario.findOne({email:req.body.email}, function(err,usuario){
		usuario.password = req.body.password;
		usuario.save(function(err){
			if(err){
				res.render('session/resetPassword',{errors: err.errors, usuario: new Usuario({email: req.body.email}),confirm_password:''});
			} else {
				res.redirect('/login');
			}
		});
	});
});

// Ruta acceso a bicicletas 
app.get('/bicis_map', function (req,res){

    Bicicleta.allBicis(function(err,bicis){
        res.status(200).json({bicicletas:bicis});
    })

});


app.use('/',indexRouter);
app.use('/usuarios', usuariosRouter);
app.use('/token', tokenRouter);

app.use('/api/auth',authAPIRouter);
app.use('/bicicletas', loggedIn , bicicletasRouter);  
app.use('/api/bicicletas', validarUsuario, bicicletasAPIRouter); 
app.use('/api/usuarios',usuariosAPIRouter);

function loggedIn(req,res,next){
    if (req.user){
        next();
    } else {
        console.log('Usuario sin loguearse');
        res.redirect('/login');
    }
};

function validarUsuario(req, res, next){
	jwt.verify(req.headers['x-access-token'], req.app.get('secretKey'),function(err, decoded){
		if(err){
			res.json({status:"error",message:err.message, data:null});
		} else {
			req.body.userId = decoded.id;
			console.log('jwt verify ' + decoded);
			next();
		}
	});
}
   

app.listen(app.get('port'), () => console.log(`- Nodejs server listening at http://localhost:${app.get('port')} -`));