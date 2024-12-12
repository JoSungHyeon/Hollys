const express = require('express');
const app = express();
const { MongoClient, ObjectId } = require('mongodb');
const methoddOverride = require('method-override');
const bcrypt = require('bcrypt');

require('dotenv').config(); // 환경변수

app.use(express.static(__dirname + "/public"));
app.use(methoddOverride('_method'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({extended:true}));

// join
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const MongoStore = require('connect-mongo'); // 로그인된 세션 몽고디비에 저장하기
app.use(passport.initialize())
app.use(session({
    secret: process.env.SECRET_PASSWORD,
    resave : false,
    saveUninitialized : false,
    cookie: { maxAge: 60 * 60 * 1000 },
    store: MongoStore.create({ // 이거 추가해야함 아니면 걍 메모리일뿐
      mongoUrl: process.env.DB_URL,
      dbName: 'hollys'
    })
}));

app.use(passport.session());

// db호출
let db
const url = process.env.DB_URL;
new MongoClient(url).connect().then((client)=>{
  console.log('DB연결성공')
  db = client.db('hollys');
  app.listen(process.env.PORT, () => {
    console.log("http://localhost:5000 에서 서버 실행중");
  });
}).catch((err)=>{
  console.log(err)
});

// 로그인 미들웨어
function checkLogin(req, res, next) {
	if(req.body.username == "" || req.body.password == "") {
	  res.send("아이디를 입력해 주세요.");
	} else {
	  next() // 미들웨어 함수 끝나면 실행하는 함수
	}
}

// home
app.get('/', (req, res) => {
	const isLogged = req.session.user ? true : false;
	res.render('index.ejs', {login: isLogged});
});


// login
passport.use(new LocalStrategy(async (입력한아이디, 입력한비번, cb) => { // 로그인될때 유저정보가 데이터베이스에 있는지
	let result = await db.collection('user').findOne({ username : 입력한아이디})
	if (!result) {
	  return cb(null, false, { message: '아이디 DB에 없음' })
	}
	if (await bcrypt.compare(입력한비번, result.password)) { // bcrypt.compare로 해싱된 비밀번호 맞는지 확인
	  return cb(null, result)
	} else {
	  return cb(null, false, { message: '비번불일치' });
	}
}));
  
passport.serializeUser((user, done) => {
	process.nextTick(() => {
	  done(null, { id: user._id, username: user.username })
	})
});
  
passport.deserializeUser(async (user, done) => {
	let result = await db.collection('user').findOne({_id: new ObjectId(user.id)})
	delete result.password
	process.nextTick(() => {
	  done(null, result)
	})
});

app.get('/login', (req, res) => {
	res.render('login.ejs');
});

app.post('/login', checkLogin, async (req, res, next) => {
	passport.authenticate('local', (error, user, info) => { // 패스포트로 로그인정보 확인하기
	  if(error) return res.status(500).json(error)
	  if(!user) return res.status(401).json(info.message)
	  req.logIn(user, (err) => {
		if(err) return next(err)
		  req.session.user = user;
		  res.redirect('/')
	  })
	})(req, res, next)
});

app.get('/logout', (req, res) => {
	req.logOut((e) => {
	  if(e) return next(e);
	  req.session.destroy((e) => {
		if(e) return next(e);
		res.clearCookie('connect.sid');
		res.redirect('/');
	  });
	});
});


// join
app.get('/join', (req, res) => {
	res.render('join.ejs');
});

app.post('/join', checkLogin, async (req, res) => {
	let hash = await bcrypt.hash(req.body.password, 10);
	let result = await db.collection('user').findOne({username: req.body.username});
	try {
	  if(result == null) {
		if(req.body.password == req.body.confirm) {
		  await db.collection('user').insertOne({
			username: req.body.username,
			password: hash,
			email: req.body.email,
			number: req.body.number,
			cart: []
		  })
		  res.render('join_complete.ejs');
		} else {
		  res.status(401).send("비밀번호를 확인해 주세요.");
		}
	  } else {
		res.status(401).send("중복된 아이디입니다.");
	  }
	} catch(e) {
	  res.status(500).send("서버 에러입니다.");
	}
});

app.get('/mypage', (req, res) => {
	res.render('mypage.ejs', {result: req.user})
})

app.get('/qna', async (req, res) => {
	const isLogged = req.session.user ? true : false;
	let result = await db.collection('list').find({}).toArray();
	res.render('qna.ejs', {data: result, login: isLogged})
});

app.get('/write', async (req, res) => {
	const isLogged = req.session.user ? true : false;
	res.render('write.ejs', {login: isLogged, userData: req.user})
});

app.post('/write', async (req, res) => {
	const today = new Date();
	const year = today.getFullYear();
	const month = today.getMonth() + 1;
	const day = today.getDate();
	const formattedDay = day < 10 ? `0${day}` : day;
	await db.collection('list').insertOne({title: req.body.title, desc: req.body.desc, time: `${year}-${month}-${formattedDay}`});
	res.redirect('/qna');
});


app.get('/espresso', async(req, res) => {
	const isLogged = req.session.user ? true : false;
	let result = await db.collection('espresso').find({}).toArray();
	res.render('espresso.ejs', {data: result, login: isLogged});
});

app.get('/signature', async(req, res) => {
	const isLogged = req.session.user ? true : false;
	let result = await db.collection('signature').find({}).toArray();
	res.render('signature.ejs', {data: result, login: isLogged});
});

app.get('/hollyccino', async(req, res) => {
	const isLogged = req.session.user ? true : false;
	let result = await db.collection('hollyccino').find({}).toArray();
	res.render('hollyccino.ejs', {data: result, login: isLogged});
});