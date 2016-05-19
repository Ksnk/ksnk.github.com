// **********************************************************************
// **  простое применение классов из aengine.js
// **   объекты - snow и air
// **********************************************************************

// элемент - точка, отталкивающаяся от остальных точек.
//         привязаная к другому объекту резинкой
point = newClass(sputnik,{
	speed :{x:0,y:0},
	mass:1,
	link0:1,
	link1:1,
	latex:0.05,
	lat_len:20,
	grav_cns:1000,
	act: function (item) {
        if (!item.pos) return null;
        var dx=this.pos.x-item.pos.x,
        	dy=this.pos.y-item.pos.y;
		var disp=Math.sqrt(dx*dx+dy*dy);
		if (disp<20) {disp=20;k = 0.4} // k=2000/20/20/20
		else k=(this.mass+item.mass)*this.grav_cns/Math.pow(disp,3)  ;
        if (((item==this.link0) ||
        	 (item==this.link1)
            ) && (disp>this.lat_len))
            k-=this.latex*(1-this.lat_len/disp) ;
        return {x:-dx*k,y:-dy*k}
	}
});
// элемент - точка, привязанная к курсору
curs = newClass(point,{
    self_act: function() {
        if (this.speed) delete (this.speed);
    	this.pos.x=this.Engine.cursor.x;
    	this.pos.y=this.Engine.cursor.y;
    },
    paint_Item:function(c) {
  	    this.constructor.prototype.paint_Item.call(this,c);
  	    this.Engine.cursor_handle();
    },
	draw: function(w,s) {
	}
});


