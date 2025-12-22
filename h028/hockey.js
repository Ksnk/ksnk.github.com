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
let Game = {
    fmaxX:0,fmaxY:0,
    curpos: null, // текущая позиция мяча
    field: [], // массив массивов точек
    curcolor: 0,
    disp:[[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]],

    /**
     * сделать ход с индексом X
     * @param x
     * todo: рефактор+, проверка
     */
    mk_turn: function (x) {
        let cp=this.curpos;
        if(!!cp.lines[x] && cp.lines[x].can){
            cp.lines[x].can=false;
            cp.click++;
            var xx = {prev:cp, x:x, color: this.curcolor};
            xx.past=cp.next[x];
            xx.past.click++;
            this.curpos=xx.past;
            this.turns.push(xx);
        }
    },
    /**
     * отменить последний ход
     * todo: рефактор+
     */
    back_turn: function () {
        if (!this.turns.length) return;
        var xx = this.turns.pop();
        xx.past.click--;
        xx.prev.click--;
        xx.prev.lines[xx.x].can=true;
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
    fillfield: function (fmaxX, fmaxY, b_z, s_z, vorota) {
        this.fmaxX = fmaxX;
        this.fmaxY = fmaxY;
        this.vorota=vorota;
        this.s_z = s_z;
        this.b_z = b_z;
        this.minRed=0;
        this.maxBlue=0;
        let that = this;

        function enumfields(callback) {
            for (let i = 0; i < fmaxX; i++) {
                for (let j = 0; j < fmaxY; j++) {
                    callback( i, j);
                }
            }
        }

        for (let i = 0; i < fmaxX; i++) this.field[i] = [];
        let midX = fmaxX >> 1, midY = fmaxY >> 1;
        /** массив точек поля с координатами и стоимостью*/
        enumfields(function (i, j) {
            let cost = 0,
                mm = Math.min(Math.abs(i - midX - 1), Math.abs(i - midX), Math.abs(i - midX + 1));
            if(that.vorota>2){
                mm = Math.min(mm, Math.abs(i - midX - 2), Math.abs(i - midX + 2))
            }
            if(that.vorota>3){
                mm = Math.min(mm, Math.abs(i - midX - 3), Math.abs(i - midX + 3))
            }
            if (j <= midY)
                cost = 100 * (-midY + Math.max(j, mm));
            else
                cost = 100 * (midY - Math.max(fmaxY - 1 - j, mm));
            that.field[i][j] = {cost: cost, lines: [null,null,null,null,null,null,null,null], next: [null,null,null,null,null,null,null,null], click: 0, x: (i + 1), y: (j + 1)}; //todo: пока непонятно, нужны ли x,y, click
            that.minRed=Math.min(that.minRed, cost);
            that.maxBlue=Math.max(that.maxBlue, cost);
        });

        /** расставляем ходы */
        function place(ii, jj, x) {
            x=1*x;
            if (ii[0] < 0 || ii[0] >= fmaxX) return;
            if (jj[0] < 0 || jj[0] >= fmaxX) return;
            if (ii[1] < 0 || ii[1] >= fmaxY) return;
            if (jj[1] < 0 || jj[1] >= fmaxY) return;
            let value={can:true};
            let l = that.field[ii[0]][ii[1]];
            if(null===l.lines[x])l.lines[x] = value;
            let x1=x+4;
            if(x1>7) x1-=8;
            let l1 = that.field[jj[0]][jj[1]];
            if(null===l1.lines[x1])l1.lines[x1] = value;
            l.next[x]=l1;
        }
        for (let xx in this.disp) {
            //0 восток-север, 1 - север, ...
            enumfields( (i, j)=>{
                place([i, j],[i +that.disp[xx][0], j +that.disp[xx][1]], xx);
            });
        }
        this.turns = [];
        this.curcolor = -1;
        // рисуем границы
        this.curpos = this.field[0][0];
        for (let i = 1; i < fmaxX; i++) {
            this.mk_turn(3);
        }
        for (let i = 1; i < fmaxY; i++) {
            this.mk_turn(5);
        }
        for (let i = 1; i < fmaxX; i++) {
            this.mk_turn(7);
        }
        for (let i = 1; i < fmaxY; i++) {
            this.mk_turn(1);
        }
        this.curpos = this.field[fmaxX >> 1][fmaxY >> 1];
        for (let i = 1; i <= fmaxX >> 1; i++) {
            this.mk_turn(3);
        }
        this.curpos = this.field[0][fmaxY >> 1];
        for (let i = 1; i <= fmaxX>> 1; i++) {
            this.mk_turn(3);
        }
        this.curcolor = 0;
        this.curpos = this.field[fmaxX >> 1][fmaxY >> 1];
    },
    /**
     * сделай следующий шаг
     */
    nextturn: function (fromturn) {
        if (null === fromturn) fromturn = 0;
        else
            fromturn++;
        while(fromturn <= 7) {
            if (!this.curpos.lines[fromturn] || !this.curpos.lines[fromturn].can) {
                fromturn++; continue;
            }
            return fromturn;
        }
        return false;
    },
    /**
     * Минимaх
     * @param depth
     * @param color
     * @returns {number[]|number}
     */
    calc: function (depth, color) {
        let BestTurn = null;
        let MaxDepth = 8, bt,
            [MaxScore, Score] = color ? [this.minRed-200, this.maxBlue + 100] : [this.maxBlue+200 , this.minRed-100],
            x, i = null;
        while (false !== (i = this.nextturn(i))) {
            this.mk_turn(i);
            if (this.curpos.click === 1) {
                this.curcolor = 1 - this.curcolor;
            }
            x = this.curpos.cost;
            if (depth >= MaxDepth || x <= this.minRed || x >= this.maxBlue) {
                Score = x;
            } else {
                [bt,Score] = this.calc(depth + 1, this.curcolor);
            }
            this.back_turn();
            if (color ? Score > MaxScore : Score < MaxScore) {
                MaxScore = Score;
                BestTurn = i;
            }
        }
        return [BestTurn, MaxScore];
    }
}
/**
 * svg_helper
 * @type {{}}
 */
let sh = {
    $: (n, clear=false) => {
        let e=document.getElementById(n);
        if(clear===true)
        while (e.lastElementChild) {
            e.removeChild(e.lastElementChild);
        }
        return e;
    },
    attr: (e, attr) => {
        if (!!attr) for (let a in attr) {
            if(a==='style' && typeof attr.style !== 'string' && !attr.style instanceof String){
                for(let s in attr.style)
                    e.style[s]=attr.style[s];
            } else
                e.setAttribute(a, attr[a]);
        }
    },
    create: function (element, attr) {
        let e = document.createElementNS('http://www.w3.org/2000/svg', element);
        this.attr(e, attr);
        return e;
    }
}

function createField() {
    let fmaxX = 11, fmaxY = 15;
    Game.fillfield(fmaxX, fmaxY,20,45,2);
    let r_len=Game.s_z;
    let vorota=Game.vorota;
    //  console.log(Game);

    // creave SVG field
    let svg = sh.$('svg-border', true);
    //place border
    let b_z = Game.b_z, s_z = r_len, midX = fmaxX >> 1, midY = fmaxY >> 1;

    svg.appendChild(sh.create('path', {
            d: `m${b_z} ${b_z}h${(fmaxX - 1) * s_z}v${(fmaxY - 1) * s_z}h-${(fmaxX - 1) * s_z}v-${(fmaxY - 1) * s_z} m0 ${midY * s_z}h${(fmaxX - 1) * s_z}`
        }
    ));

    sh.$('svg-turns', true);
    svg = sh.$('svg-points', true);
    //place points
    for (let i = 0; i < fmaxX; i++) for (let j = 0; j < fmaxY; j++) {
        let a = {
            r: 3, "cx": `${b_z + i * r_len}`, "cy": `${b_z + j * r_len}`
        };
        if (Math.abs(midX - i) < vorota && j === 0) {
            a["class"] = `box col0`;
            a['r']=7;
        }
        if (Math.abs(midX - i) < vorota && j === fmaxY - 1) {
            a["class"] = `box col1`;
            a['r']=7;
        }
        svg.appendChild(sh.create('circle', a));
    }

    svg = sh.$('svg-ball', true);
    svg.appendChild(sh.create('circle', {"r": `9`, "cx": `${b_z + midX * r_len}`, "cy": `${b_z + midY * r_len}`}));
//-----------------
    svg.parentNode.style.minHeight = `${b_z + b_z + (fmaxY - 1) * s_z}px`;
    svg.parentNode.style.minWidth = `${b_z + b_z + (fmaxX - 1) * s_z}px`;
    svg.parentNode.setAttribute('viewBox', `0 0 ${b_z + b_z + (fmaxX - 1) * s_z} ${b_z + b_z + (fmaxY - 1) * s_z}`)

    let cl=sh.$('control').classList
    cl.remove('col1');
    cl.add('col0');
}

function turn(x) {
    if (!Game.curpos.lines[x] || !Game.curpos.lines[x].can) return;
    let i0 = Game.curpos.x, j0 = Game.curpos.y;

    Game.mk_turn(x);
    // svg field
    let b_z = Game.b_z, s_z = Game.s_z;
    let disp = Game.disp[x],
        i1 = i0 + disp[0], j1 = j0 + disp[1];
    let svg = sh.$('svg-turns');
    svg.appendChild(sh.create('path', {
        d: `M${(i0 - 1) * s_z + b_z} ${(j0 - 1) * s_z + b_z}L${(i1 - 1) * s_z + b_z} ${(j1 - 1) * s_z + b_z}`,
        class: `col${Game.curcolor}`
    }));
    //console.log(x, [i0, j0], [i1, j1]);
    sh.attr(sh.$('svg-ball').children[0], {
        'cx': `${b_z + (i1 - 1) * s_z}`,
        'cy': `${b_z + (j1 - 1) * s_z}`
    });
    if (Game.curpos.click <= 1) Game.curcolor = 1 - Game.curcolor;
    let cl=sh.$('control').classList;
    cl.remove('col'+(1-Game.curcolor));
    cl.add('col'+Game.curcolor);
}

function backturn(){
    var c = Game.curcolor;
    let lastturn=Game.turns[Game.turns.length-1];
    if(lastturn.color==-1) return;
    let svg = sh.$('svg-turns');
    if(lastturn.color==1-c) {
        while (lastturn.color == 1 - c) {
            Game.back_turn();
            svg.removeChild(svg.lastChild);
            lastturn = Game.turns[Game.turns.length - 1];
        }
    }
    while (lastturn.color == c) {
        Game.back_turn();
        svg.removeChild(svg.lastChild);
        lastturn = Game.turns[Game.turns.length - 1];
    }

    let i0=Game.curpos.x, j0=Game.curpos.y, b_z=Game.b_z, s_z=Game.s_z;
    sh.attr(sh.$('svg-ball').children[0], {
        'cx': `${b_z + (i0 - 1) * s_z}`,
        'cy': `${b_z + (j0 - 1) * s_z}`
    });
    //if (Game.curpos.click == 1) Game.curcolor = 1 - Game.curcolor;
}
/**
 * двинуть мяч на один отрезок и передать ход автомату
 */
function xturn(x) {
    var c = Game.curcolor;
    if (Game.curpos.cost <= Game.minRed) {
        alert('Red player win!');
        return;
    } else if (Game.curpos.cost >= Game.maxBlue) {
        alert('Blue player win!');
        return;
    }
    if (x < 0) {
        x = [0]
        while ((x[0] !== null) && c == Game.curcolor
            && (!(Game.curpos.cost <= Game.minRed || Game.curpos.cost >= Game.maxBlue))
        ) {
            x = Game.calc(0, Game.curcolor);
            turn(x[0])
        }
        if (x[0] === null) {
            let name=Game.curcolor==0?'Blue':'Red';
            alert(name+' player win!(x)');
        }
    } else
        turn(x);
    if (sh.$('auto').checked) {
        let last=sh.$('control').style.display, control=sh.$('control');
        control.style.display = 'none';
        setTimeout(function () {
            let cnt = 100;
            while (c != Game.curcolor
                && (!(Game.curpos.cost <= Game.minRed || Game.curpos.cost >= Game.maxBlue))
            ) {
                x = Game.calc(0, Game.curcolor);
                console.log(x);
                cnt--;
                if (cnt < 0) break;
                turn(x[0])
            }
            control.style.display = last;

        }, 1);
    }
    if (Game.curpos.cost <= Game.minRed) {
        alert('Red player win!');
        return;
    } else if (Game.curpos.cost >= Game.maxBlue) {
        alert('Blue player win!');
        return;
    }
}
