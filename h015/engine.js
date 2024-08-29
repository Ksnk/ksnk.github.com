(function () {
    'use strict';

    /**
     * бегаем по массиву, без особого контроля, все свои патамушта
     * @param array
     * @param func
     */
    function each(array,  func, start) {
        let a;
        for (a = start||0; a < array.length; a++) {
            func(array[a], a);
        }
        return a;
    }

    /**
     * прокруст. Значение а обрезается по абсолютному значению m
     * @param a
     * @param m
     * @returns {number|*}
     */
    function procrustes(a, m) {
        return a > m ? m : a < -m ? -m : a;
    }

    /**
     * Расчет 1(одного) шага анимации для массива взаимодействующих объектов
     * выдает сумму всех смещений в системе для контроля, что ситуация стабильна
     * @param objects
     * @returns {number}
     * act - массив навешанных функций взаимодействия, вызываются для каждой пары объектов
     * move - функция обрабатывающая действующую на объект силу
     */
    function astep(objects) {

        let result = 0, force = []; //матрица сил
        // инициализация матрицы
        each(objects, (o, i) => {
            force[i] = {x: 0, y: 0};
        });

        // пробегаем матрицу сил уголком, строим массив воздействий
        for (let i = 0; i < objects.length - 1; i++) {
            for (let j = i + 1; j < objects.length; j++) {
                let a=each(objects[i].act, (o) => {
                    let v = o(objects[i], objects[j]);
                    if (!!v && (v.x !== 0 || v.y !== 0)) {
                        force[i].x += v.x;
                        force[j].x -= v.x;
                        force[i].y += v.y;
                        force[j].y -= v.y;
                    }
                });
                each(objects[j].act, (o) => {
                    let v = o(objects[j], objects[i]);
                    if (!!v && (v.x !== 0 || v.y !== 0)) {
                        force[j].x += v.x;
                        force[i].x -= v.x;
                        force[j].y += v.y;
                        force[i].y -= v.y;
                    }
                },a);
            }
        }

        each(objects, (o, i) => {
            result += o.move && o.move(o, force[i]) || 0;
        });
        return result;
    }

    // специфические объекты
    // Пыль. Тормозит скорость объектов
    function dust(prop) {
        if (!dust.dust) {
            dust.dust = function (self, item) {
// расчитываем силу только для точечных элементов
                if (!item || !item.speed) {
                    return {x: 0, y: 0};
                }
                // тормозим скорость на 0.01 %
                item.speed.x *= self.persent;
                item.speed.y *= self.persent;
                return {x: 0, y: 0};//{x:0.001*item.mass*item.speed.x,y:0.001*item.mass*item.speed.y};
            };
        }

        prop.name = prop.name || 'dust';
        prop.act = [dust.dust];
        prop.persent = 0.70;

        return prop;
    }

    // поддерживаем давление в системе
    function pressure(prop,press) {
        if (!pressure.pressure) {
            pressure.pressure = function (o, force) {
                let f = ['x', 'y'];
                if (o.pos.y === o.fin.y) {
                    f = ['y', 'x'];
                }
                force[f[1]] = 0;
                if (force[f[0]] > o.pressure) {
                    force[f[0]] -= o.pressure;
                    //} else if(force[f[0]]>o.pressure) {
                    //     force[f[0]]-=o.pressure;
                } else {
                    force[f[0]] -= o.pressure;
                }
                if (o.speed && o.mass) {
                    o.speed.x += force.x / o.mass;
                    o.speed.y += force.y / o.mass;
                }
                // сдвигаемся
                if (o.pos && o.speed) {
                    o.pos.x += o.speed.x;
                    o.pos.y += o.speed.y;
                    o.fin.x += o.speed.x;
                    o.fin.y += o.speed.y;
                }
            };
        }
        prop.name = prop.name || 'pressure';
        prop.pressure = prop.pressure || press ||  50;
        prop.speed = prop.speed || {x: 0, y: 0};
        prop.move = prop.move || pressure.pressure;
        //pressure:100, speed:{x:0,y:0}, move:engine.pressure
        return prop;
    }

    /**
     * Точка - отталкивается если близко, притягивается, если далеко
     * @param prop - инициация - {name,rad, mass, speed}
     * @returns {*}
     */
    function point(prop) {
        if (!point.pointmove) {
            point.pointmove = function (o, force) {
                if (o.speed && o.mass) {
                    o.speed.x += force.x / o.mass;
                    o.speed.y += force.y / o.mass;
                }
                // сдвигаемся
                if (o.pos && o.speed) {
                    o.pos.x += o.speed.x;
                    o.pos.y += o.speed.y;
                    return Math.abs(o.speed.x) + Math.abs(o.speed.y);
                }
            };
        }
        if (!point.grav) {
            // 2 точки отталкиваются друг от друга, если ближе X и притягиваются, если дальше
            point.grav = function (self, item) {
                if (!item || !item.pos) {
                    return {x: 0, y: 0};
                }
                // расстояние
                let k, dx = self.pos.x - item.pos.x,
                    dy = self.pos.y - item.pos.y;
                let qdisp = dx * dx + dy * dy, disp = Math.sqrt(qdisp);
                if (disp<2) {
                    disp=2;
                }
                if(Math.abs(disp-self.rad)<1) {
                    return {x: 0, y: 0};
                } else if(disp<self.rad) {
                        //  k=((disp - self.rad) / disp)*10;
                    // отталкиваемся
                    k = ((disp - self.rad) / disp) * (disp-self.rad)/Math.pow(disp,2);
                    //k = ((disp - self.rad) / disp) * procrustes((self.mass * item.mass) * self.grav_cns / Math.pow(self.rad-disp, 3),10);
                } else {
                   // притягиваемся
                     k = ((disp - self.rad) / disp) * procrustes((self.mass * item.mass) * self.grav_cns / Math.pow(disp, 3), 10);
                }
                return {x: dx * k, y: dy * k};
            };
        }
        if(!point.draw){
            point.draw=function(el,ctx){
                ctx.beginPath();
                ctx.arc(el.pos.x, el.pos.y, 10, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fill();
                ctx.font = "10px serif";
                let txt = '' + Math.round(el.mass), td = ctx.measureText(txt);
                ctx.strokeText(txt, el.pos.x - td.width / 2, el.pos.y + 3);
            };
        }
        prop.name = prop.name || 'point';
        prop.rad = prop.rad || 100 ;
        prop.grav_cns = prop.grav_cns || 1;
        prop.mass = prop.mass || 25;
        prop.speed = {x: 0, y: 0};
        if (!prop.act) {
            prop.act = [point.grav];
        } else {
            prop.act.push(point.grav);
        }
        prop.move = point.pointmove;
        prop.draw = point.draw;
        return prop;
    }

    // граница - одностороннее отталкивание.
    function border(prop) {
        if (!border.linerepulsor) {
            /**
             * Линия с односторонним притяжением-отталкиванием.
             * Все элементы с правой стороны линии тянутся с постоянной скоростью влево
             * Элементы слева - отталкиваются по гравитационному закону.
             * @param self
             * @param item
             * @returns {{x: number, y: number}}
             */
            border.linerepulsor = function (self, item) {
                if (!item || !item.pos) {
                    return {x: 0, y: 0};
                }
                /*
                            D = (х3 - х1) * (у2 - у1) - (у3 - у1) * (х2 - х1)
                                - Если D = 0 - значит, точка С лежит на прямой АБ.
                            - Если D < 0 - значит, точка С лежит слева от прямой.
                            - Если D > 0 - значит, точка С лежит справа от прямой. */

                let a, max = 30;
                if (self.pos.x === self.fin.x) {
                    if (self.pos.x > 0) {
                        a = self.fin.x - 10 < item.pos.x ? 10 : self.fin.x - item.pos.x;
                    } else {
                        a = self.fin.x + 10 > item.pos.x ? -10 : self.fin.x - item.pos.x;
                    }
                } else {
                    if (self.pos.y > 0) {
                        a = self.fin.y - 10 < item.pos.y ? 10 : self.fin.y - item.pos.y;
                    } else {
                        a = self.fin.y + 10 > item.pos.y ? -10 : self.fin.y - item.pos.y;
                    }
                }
                a = (self.mass + item.mass) * self.grav_cns / Math.pow(a, 3);
                if (a > max) {
                    a = max;
                } else if (a < -max) {
                    a = -max;
                }
                if (self.pos.x === self.fin.x) {
                    return {x: a, y: 0};
                } else {
                    return {x: 0, y: a};
                }
            };
        }
        prop.name = prop.name || 'line';
        prop.grav_cns = prop.grav_cns || 500;
        prop.mass = prop.mass || 500;
        if (!prop.act) {
            prop.act = [border.linerepulsor];
        } else {
            prop.act.push(border.linerepulsor);
        }
        //prop.move=engine.bordermove;
        return prop;
    }

    // инициализируем систему
    const
        canvas = document.getElementById("canvas"),
        ctx = canvas.getContext("2d");

    let i, h = parseInt(canvas.getAttribute('height')), w = parseInt(canvas.getAttribute('width')),
        world =    // пример генерации объектов, Сначала активные спец объекты, потом точечные, потом неактивные
            [
                dust([]),
                border({pos: {x: 0, y: 0}, fin: {x: w, y: 0}}),
                border({pos: {x: w, y: h}, fin: {x: 0, y: h}}),
                border({pos: {x: 0, y: h}, fin: {x: 0, y: 0}})
            ];
    world.push(pressure( border({pos: {x: w, y: 0}, fin: {x: w, y: h}}),20));
//*
    for (i = 0; i < 100; i++) {
        world.push(point({
            mass: 20 * (1 + Math.random()),
            pos: {x: w * Math.random(), y: h * Math.random()},
        }));
    }
//*/
//    world.push(point({ mass: 20 * (1 + Math.random()), pos: {x: 470, y: 100} }));
//    world.push(point({ mass: 20 * (1 + Math.random()), pos: {x: 532, y: 100} }));
// поехали
    function _draw(world) {
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#fff';
        // w=world[2].pos.x;
        ctx.clearRect(0, 0, w, h);
        let i;
        for (i = 0; i < world.length; i++) {
            if (world[i].draw) {
                world[i].draw(world[i],ctx);
            }
        }
    }
    /**
     * отложенный draw - заявка на перерисовку. Можно частить, все равно не должно тормозить
     */
    function draw(world) {
        if (!draw._TO) {
            draw._TO = window.requestAnimationFrame(function () {
                draw._TO = false;
                _draw(world);
            });
        }
    }

    if (true) {
        while (200 > astep(world)) {
            ;
        }
        w=world[4].pos.x;
        canvas.setAttribute('width', world[4].pos.x);
        draw(world);
        setInterval(function () {
            astep(world);
            draw(world);
        }, 10);
    } else {
        setInterval(function () {
            astep(world);
            draw(world);
        }, 10);
    }
})();