const express = require('express');
const app = express();

app.use(express.static(__dirname + "/public"));
app.set('view engine', 'ejs');

app.listen(8080, () => {
	console.log("http://localhost:8080 에서 서버 실행 중");
});

app.get('/', (req, res) => {
	res.render('index.ejs');
});