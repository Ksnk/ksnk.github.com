// **********************************************************************
// **  ������� ���������� ������� �� aengine.js
// **   ������� - snow � air
// **********************************************************************

// ������� - �������� ��������.
// ��� ������ �� ������� ������ ��� ��������� ������� ����������� � ������� ����� ������
snow = newClass(a_item,{
	pos:{x:-1000,y:-1000}, // ����� ��������� ������� �������������� ��������� ���������� �� ������
	speed :{x:0,y:0},
	mass:1,
	visibility:'hidden',
	waittill:0,
	draw: function(w,s) {
		if (this.outof(w,s)!=0) {
			this.pos={x:s.x+this.ww.x+Math.random()*(w.x),y:s.y+this.ww.y+Math.random()*(w.y)/3};
			this.waittill=1+Math.round(50*Math.random()) ;// 100*50 = 5 ������ �� ������ �������� ��������
			this.elm.style.visibility='hidden';
		}
		if (this.waittill==1) {
  			this.constructor.prototype.draw.call(this,w,s);
			this.elm.style.visibility='visible';
			this.waittill=0;
		} else if (this.waittill>1)
			this.waittill--;
		else
  			this.constructor.prototype.draw.call(this,w,s);
	}
});

// ���� - ��� ��������, � ������� ������ :) ��� ������ �� ����� -
//   ������������ � �����-������� ����.
cloud= newClass(snow,{
	mass:0, // ������ �� ����� �����!!!!!
	draw: function(w,s) {
		if (this.outof(w,s)!=0) {
			this.pos={x:s.x+this.ww.x+Math.random()*(w.x)/3,y:s.y+this.ww.y+Math.random()*(w.y)/3};
			this.elm.style.visibility='visible';
		}
		this.constructor.prototype.draw.call(this,w,s);
	}
});

// ��������� ������� - ���������� �������� + ����������.
air = newClass(a_item,{
    name:'���������',
    turbo:{x:4,y:4}, // ����������� �������� ��� ����������
    grav : 1 , // ���� ����������
    resistance: 0.5,
	act: function (item) {
        if (item.speed && item.mass)
        	return{x:         -item.speed.x*this.resistance+this.turbo.x*(Math.random()-0.5),
        	       y:this.grav-item.speed.y*this.resistance+this.turbo.y*(Math.random()-0.5)} ;
		return null;   // �� ������ ���� �������� �� ��������.
	}
});
// ��������� ������� - "�����" �� �����.
// ��������� ������ �� ������������������� �������
// �������� ���� ����������� � �������
wind = newClass(a_item,{
    name:'�����',
    curx:0,
    cury:0,
    forcex:0,
    forcey:0,
    k:10,
	act: function (item) {
        var dx=this.curx-item.pos.x,
        	dy=this.cury-item.pos.y;
		var kk=this.k/(1+Math.sqrt(dx*dx+dy*dy));

        if (item.speed && item.mass)
		    return {x: kk*this.forcex,
		            y: kk*this.forcey};
		else
		    return null;       // �� ������ ���� �������� �� ��������.
	},
    self_act: function() {
    // ��������� ����������� ����
    	this.curx+=(this.forcex=this.Engine.cursor.x-this.curx);
    	this.cury+=(this.forcey=this.Engine.cursor.y-this.cury)
    },
    paint_Item:function(c) {
  	    this.constructor.prototype.paint_Item.call(this,c);
  	    this.Engine.cursor_handle();
    }
 });

