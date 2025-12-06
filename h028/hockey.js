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
                let mid = fmaxX >> 1;
                if (j * 2 <= fmaxY)
                    x[j].cost = 100 * Math.max(j, Math.min(Math.abs(i - mid - 1), Math.abs(i - mid), Math.abs(i - mid + 1)));
                else
                    x[j].cost = 100 * (fmaxY - Math.max(fmaxY - 1 - j, Math.min(Math.abs(i - mid - 1), Math.abs(i - mid), Math.abs(i - mid + 1))));
            }
        }
        this.MaxScore = 100 * fmaxY;
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
        if (null === fromturn) fromturn = 0;
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
        let MaxDepth = 7, [MaxScore, Score] = color ? [-1, this.MaxScore + 100] : [this.MaxScore + 100, -1], x,
            i = null;
        this.curcolor = color;
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
/**
 * svg_helper
 * @type {{}}
 */
let sh = {
    $: (n) => document.getElementById(n),
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
    let fmaxX = 11, fmaxY = 15, r_len = 45;
    hockeyGame.fillfield(fmaxX, fmaxY);
    //  console.log(hockeyGame);

    // creave SVG field
    let svg = sh.$('svg-border');
    // m20 45h150v250h-150v-250z
    // clear all childs
    while (svg.lastElementChild) {
        svg.removeChild(svg.lastElementChild);
    }
    //place border
    let b_z = 20, s_z = 45, midX = fmaxX >> 1, midY = fmaxY >> 1;

    svg.appendChild(sh.create('path', {
            d: `m${b_z} ${b_z}h${(fmaxX - 1) * s_z}v${(fmaxY - 1) * s_z}h-${(fmaxX - 1) * s_z}v-${(fmaxY - 1) * s_z} m0 ${midY * s_z}h${(fmaxX - 1) * s_z}`
        }
    ));

    svg = sh.$('svg-points');
    while (svg.lastElementChild) {
        svg.removeChild(svg.lastElementChild);
    }
    //place points
    for (let i = 0; i < fmaxX; i++) for (let j = 0; j < fmaxY; j++) {
        let a = {
            r: 5, "cx": `${b_z + i * r_len}`, "cy": `${b_z + j * r_len}`
        };
        if (Math.abs(midX - i) < 2 && (j === 0 || j === fmaxY - 1))
            a["class"] = `box`;
        svg.appendChild(sh.create('circle', a));
    }

    svg = sh.$('svg-ball');
    while (svg.lastElementChild) {
        svg.removeChild(svg.lastElementChild);
    }
    svg.appendChild(sh.create('circle', {"r": `6`, "cx": `${b_z + midX * r_len}`, "cy": `${b_z + midY * r_len}`}));
//-----------------
    svg.parentNode.style.minHeight = `${b_z + b_z + (fmaxY - 1) * s_z}px`;
    svg.parentNode.style.minWidth = `${b_z + b_z + (fmaxX - 1) * s_z}px`;
    svg.parentNode.setAttribute('viewBox', `0 0 ${b_z + b_z + (fmaxX - 1) * s_z} ${b_z + b_z + (fmaxY - 1) * s_z}`)
}

function turn(x) {
    var s;
    if (!hockeyGame.curpos.lines[x]) return;
    hockeyGame.mk_turn(x);
    //drawturn(x,curcolor==0?'red':'blue');
    // svg field
    let b_z = 20, s_z = 45;
    let i0 = hockeyGame.curpos.x, j0 = hockeyGame.curpos.y,
        disp = [
            [1, 1], [0, 1], [-1, 1], [-1, 0],
            [1, 0], [1, -1], [0, -1], [-1, -1]][x],
        i1 = i0 + disp[0], j1 = j0 + disp[1];
    let svg = sh.$('svg-turns');
    svg.appendChild(sh.create('path', {
        d: `M${(i1 - 1) * s_z + b_z} ${(j1 - 1) * s_z + b_z}L${(i0 - 1) * s_z + b_z} ${(j0 - 1) * s_z + b_z}`,
        class: `col${hockeyGame.curcolor}`
    }));
    console.log(x, [i0, j0], [i1, j1]);
    sh.attr(sh.$('svg-ball').children[0], {
        'cx': `${b_z + (i0 - 1) * s_z}`,
        'cy': `${b_z + (j0 - 1) * s_z}`
    });
    if (hockeyGame.curpos.click == 1) hockeyGame.curcolor = 1 - hockeyGame.curcolor;
}

/**
 * двинуть мяч на один отрезок и передать ход автомату
 */
function xturn(x) {
    var c = hockeyGame.curcolor;
    if (hockeyGame.curpos.cost == 0) {
        alert('Red player win!');
        return;
    } else if (hockeyGame.curpos.cost == hockeyGame.MaxScore) {
        alert('Blue player win!');
        return;
    }
    if (x < 0) {
        x = [0]
        while ((x[0] !== null) && c == hockeyGame.curcolor && (!(hockeyGame.curpos.cost == 0 || hockeyGame.curpos.cost == hockeyGame.MaxScore))) {
            x = hockeyGame.calc(0, hockeyGame.curcolor);
            turn(x[0])
        }
        if (x[0] === null) {
            alert('Blue player win!(x)');
        }
    } else
        turn(x);
    if (sh.$('auto').checked) {
        let last=sh.$('control').style.display;
        sh.$('control').style.display = 'none';
        setTimeout(function () {
            let cnt = 100;
            while (c != hockeyGame.curcolor && (!(hockeyGame.curpos.cost <= 0 || hockeyGame.curpos.cost >= hockeyGame.MaxScore))) {
                x = hockeyGame.calc(0, hockeyGame.curcolor);
                console.log(x);
                cnt--;
                if (cnt < 0) break;
                turn(x[0])
            }
            sh.$('control').style.display = last;
        }, 1);
    }
    if (hockeyGame.curpos.cost === 0) {
        alert('Red player win!');
        return;
    } else if (hockeyGame.curpos.cost === hockeyGame.MaxScore) {
        alert('Blue player win!');
        return;
    }
}
