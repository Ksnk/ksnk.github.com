/**
 * Хоккей: [ru.ruwiki.ru/wiki/Футбол_(игра_на_бумаге)]
 *
 * рисуется на маленьком поле 1/16 тетрадного листа (6 × 8[8][9] или 8 × 10[7]);
 * партия занимает мало времени;
 * каждый игрок рисует ломаную линию длиной в 1 клеточку, при касании уже нарисованных линий ход продолжается;
 * шайба отражается от краев поля;
 * если игрок не может ходить, то он проигрывает;
 * цели игры — забить шайбу в ворота противника, расположенные не обязательно на границе поля, либо загнать противника в тупик;
 * многократное продление хода возможно с начала игры и является обычным приёмом;
 * ничья невозможна
 *
 *
 * Поле игры [x,y] состоит из точек c перечисленными там возможными ходами - 8 направлений
 * @type {{curpos: null, nextturn: ((function(*): (boolean|*))|*), calc: ((function(*, *): (number[]|number))|*)}}
 */
let hockeyGame = {

    curpos: null, // текущая позиция мяча
    field: [], // массив массивов точек
    curcolor: 0,
    mk_turn: function (x) {
        var xx = {past: this.curpos.lines[x], prev: this.curpos, x: x, color: this.curcolor};
        xx.past.click++;
        xx.past.lines[7 - x] = null;

        xx.prev.click++;
        xx.prev.lines[x] = null;

        this.turns.push(xx);
        this.curpos = xx.past;
    },
    back_turn: function () {
        if (!this.turns.length) return;
        var xx = this.turns.pop(), x = xx.x;
        xx.past.click--;
        xx.past.lines[7 - x] = xx.prev;
        xx.prev.click--;
        xx.prev.lines[x] = xx.past;
        this.curcolor = xx.color;
        this.curpos = xx.prev;
    },
    /**
     * начальная инициализация и заполнение поля игры
     * каждая клетка поля содержит:
     *  x,y - собственные координаты для удобства отрисовки
     *  click - счетчик "входящих" линий
     *  lines - массив возможных ходов по 8 направлениям
     *  cost - "стоимость" позиции, как расстояние до ворот противника
     */
    fillfield: function (fmaxX, fmaxY) {
        this.field = [];
        let that = this;
        for (let i = 0; i < fmaxX; i++) {
            this.field[i] = [];
            let x = this.field[i];
            for (let j = 0; j < fmaxY; j++) {
                x[j] = {click: 0, x: (i + 1), y: (j + 1)} // инициализация поля
            }
        }

        function in_field(x, y) {
            if (x >= 0 && x < fmaxX && y >= 0 && y < fmaxY)
                return that.field[x][y];
            else
                return null;
        }

        for (var i = 0; i < fmaxX; i++) {
            var x = this.field[i];
            for (var j = 0; j < fmaxY; j++) {
                x[j].lines = [
                    in_field(i - 1, j - 1), in_field(i, j - 1), in_field(i + 1, j - 1), in_field(i + 1, j),
                    in_field(i - 1, j), in_field(i - 1, j + 1), in_field(i, j + 1), in_field(i + 1, j + 1)
                ];
                let mid = fmaxX>>1;
                if (j * 2 <= fmaxY)
                    x[j].cost = 100 * Math.max(j, Math.min(Math.abs(i - mid-1), Math.abs(i - mid), Math.abs(i - mid+1)));
                else
                    x[j].cost = 100 * (fmaxY - Math.max(fmaxY - 1 - j, Math.min(Math.abs(i - mid-1), Math.abs(i - mid), Math.abs(i-mid+1))));
            }
        }
        this.MaxScore=100*fmaxY;
        this.turns = [];
        this.curcolor = -1;
        // рисуем границы
        this.curpos = this.field[0][0];
        for (let i = 1; i < fmaxX; i++) {
            this.mk_turn(3);
        }
        for (let i = 1; i < fmaxY; i++) {
            this.mk_turn(6);
        }
        for (let i = 1; i < fmaxX; i++) {
            this.mk_turn(4);
        }
        for (let i = 1; i < fmaxY; i++) {
            this.mk_turn(1);
        }
        this.curpos = this.field[0][fmaxY >> 1];
        for (let i = 1; i < fmaxX; i++) {
            this.mk_turn(3);
        }
        this.curcolor = 0;
        this.curpos = this.field[fmaxX >> 1][fmaxY >> 1];
    },
    /**
     * сделай следующий шаг
     */
    nextturn: function (fromturn) {
        if (null === fromturn) fromturn= 0;
        else
            fromturn++;
        if (fromturn > 7) return false;
        if (!this.curpos.lines[fromturn])
            return this.nextturn(fromturn);
        return fromturn;
    },
    /**
     * Минимaх
     * @param depth
     * @param color
     * @returns {number[]|number}
     */
    calc: function (depth, color) {
        let BestTurn = null;
        let MaxDepth=7,[MaxScore, Score] = color ? [-1, this.MaxScore+100] : [this.MaxScore+100, -1], x, i = null;
        this.curcolor=color;
        while (false !== (i = this.nextturn(i))) {
            this.mk_turn(i);
            x = this.curpos.cost;
            if (depth >= MaxDepth || x === 0 || x === this.MaxScore) {
                Score = x;
            } else {
                if (this.curpos.click === 1) {
                    this.curcolor = 1 - this.curcolor;
                }
                Score = this.calc(depth + 1, this.curcolor);
            }
            this.back_turn();
            if (color ? Score > MaxScore : Score < MaxScore) {
                MaxScore = Score;
                BestTurn = i;
            }
        }
        if (depth === 0) return [BestTurn, MaxScore];
        else return MaxScore;
    }
}
function createField() {
    let fmaxX = 9, fmaxY = 11, r_len = 45,pictures=[
        {name:'_less',dx:12,dy:12},
        {name:'_vert',dx:1,dy:10},
        {name:'_more',dx:-r_len+12,dy:12},
        {name:'_hor',dx:-r_len+12,dy:2},
        {name:'_hor',dx:12,dy:2},
        {name:'_more',dx:12,dy:-r_len+12},
        {name:'_vert',dx:1,dy:-r_len+10},
        {name:'_less',dx:-r_len+12,dy:-r_len+12}
    ];
    hockeyGame.fillfield(fmaxX, fmaxY);
  //  console.log(hockeyGame);
    let f = document.getElementById('field');
    f.style.width = (fmaxX * r_len + 65) + 'px';
    f.style.height = (fmaxY * r_len + 65) + 'px';
    let cball = document.getElementById('gold_center');
    // желтые точки по полю бросаем
    for (var i = 0; i < fmaxX; i++) {
        var x = hockeyGame.field[i];
        for (var j = 0; j < fmaxY; j++) {
            var xx = cball.cloneNode(true);
            xx.removeAttribute('id');
            xx.style.left = (x[j].x * r_len) + 'px';
            xx.style.top = (x[j].y * r_len) + 'px';
            //fixPNG(xx);
            f.appendChild(xx);
            xx = null;
        }
    }
    // раскидываем палки
    let color='gold';
    for( let turn of hockeyGame.turns ){
        let cball=document.getElementById(color+pictures[turn.x].name);
        let xx=cball.cloneNode(true);xx.removeAttribute('id');
        xx.style.top=(turn.past.y*r_len+pictures[turn.x].dy)+'px';
        xx.style.left=(turn.past.x*r_len+pictures[turn.x].dx)+'px';
        f.appendChild(xx);
    }

    var tmp={'gw_red':fmaxY,'gw_blue':0};
    for(a in tmp){
        let xx=document.getElementById(a);
        xx.removeAttribute('id');
        xx.style.top=(tmp[a]*r_len +12)+'px';
        xx.style.left=((fmaxX>>1)*r_len - (r_len>>1)+10)+'px';
        f.appendChild(xx);
        xx=null;
    }
    let ball = document.getElementById('ball');
    ball.style.top=(hockeyGame.curpos.y*r_len-8)+'px';
    ball.style.left=(hockeyGame.curpos.x*r_len-6)+'px';
    ball.style.display='block';
}

function turn(x){
    var s;
    if(!hockeyGame.curpos.lines[x])return;
    hockeyGame.mk_turn(x);
    let color =hockeyGame.curcolor==0?'red':'blue',r_len = 45,pictures=[
        {name:'_less',dx:12,dy:12},
        {name:'_vert',dx:1,dy:10},
        {name:'_more',dx:-r_len+12,dy:12},
        {name:'_hor',dx:-r_len+12,dy:2},
        {name:'_hor',dx:12,dy:2},
        {name:'_more',dx:12,dy:-r_len+12},
        {name:'_vert',dx:1,dy:-r_len+10},
        {name:'_less',dx:-r_len+12,dy:-r_len+12}
    ];
    let cball=document.getElementById(color+pictures[x].name);
    var xx=cball.cloneNode(true);xx.removeAttribute('id');
    xx.style.top=(hockeyGame.curpos.y*r_len+pictures[x].dy)+'px';
    xx.style.left=(hockeyGame.curpos.x*r_len+pictures[x].dx)+'px';
    document.getElementById('field').appendChild(xx);

    let ball = document.getElementById('ball');
    ball.style.top=(hockeyGame.curpos.y*r_len-8)+'px';
    ball.style.left=(hockeyGame.curpos.x*r_len-6)+'px';
    ball.style.display='block';
    //drawturn(x,curcolor==0?'red':'blue');

    if(hockeyGame.curpos.click==1)hockeyGame.curcolor=1-hockeyGame.curcolor;
}
/**
 * двинуть мяч на один отрезок и передать ход автомату
 */
function xturn(x){
    var c=hockeyGame.curcolor;
    if(hockeyGame.curpos.cost==0){
        alert('Red player win!');
        return ;
    } else if( hockeyGame.curpos.cost==hockeyGame.MaxScore) {
        alert('Blue player win!');
        return ;
    }
    if (x<0) {
        x=[0]
        while((x[0]!==null) && c==hockeyGame.curcolor &&(!(hockeyGame.curpos.cost==0 || hockeyGame.curpos.cost==hockeyGame.MaxScore))){
            x=hockeyGame.calc(0,hockeyGame.curcolor);
            turn(x[0])
        }
        if(x[0]===null) {
            alert('Blue player win!(x)');
        }
    } else
        turn(x);
    if(document.getElementById('auto').checked){
        document.getElementById('control').style.display='none';
        setTimeout(function(){
            let cnt=100;
            while(c!=hockeyGame.curcolor &&(!(hockeyGame.curpos.cost<=0 || hockeyGame.curpos.cost>=hockeyGame.MaxScore))){
                x=hockeyGame.calc(0,hockeyGame.curcolor);
                console.log(x);
                cnt--; if(cnt<0) break;
                turn(x[0])
            }
            document.getElementById('control').style.display='block';
        },1);
    }
    if(hockeyGame.curpos.cost==0){
        alert('Red player win!');
        return ;
    } else if( hockeyGame.curpos.cost==hockeyGame.MaxScore) {
        alert('Blue player win!');
        return ;
    }
}
