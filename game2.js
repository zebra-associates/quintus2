var CANVAS_WIDTH=1000;
var CANVAS_HEIGHT=400; //todo
var bColors = ["#008000","#006400", "#FF4500", "#000080", "#696969", "#800080", "#808000", "#A52A2A", "#8B4513", "#FFDEAD", "#FFFF40","#000080" , "#FFFF80"]; //list 

var Q = Quintus({ development: true });

Q.include("Sprites, Scenes, Input, UI, Touch, 2D, TMX");

//Q.gravityY = 0;
function akey(k) {  //represents a keyboard button  //convert to quintus?
    k = k || "space";
    this.key =k;
    this.aflag=false;
    this.dflag=false;
    this.check= function(){
        if (keydown[this.key]) { 
            this.aflag=true;
            return false;
        }
        if((!keydown[this.key]) && (this.aflag===true)){
            this.aflag=false;
            return true;
        }
    };
    this.checkDown= function(){
        if ((keydown[this.key] )  && (!this.dflag)) { 
            this.dflag=true;
            return true;
        }
        if(!keydown[this.key]){
            this.dflag=false;
            return false;
        }
    };
    return this;
}

var upkey=new akey("up");
var rightkey=new akey("right");
var downkey=new akey("down");
var leftkey=new akey("left");

var gameSpeed=1000;
var timestamp = new Date(); 
var milliseconds = timestamp.getTime();
var millisecondsL = timestamp.getTime();
var millisecondsR = timestamp.getTime();
var millisecondsU = timestamp.getTime();
var millisecondsD = timestamp.getTime();
var lastLeft=0;
var lastRight=0;
var lastUp=0;
var lastDown=0;
//var lasttime=0;

Q.setup({ height: CANVAS_HEIGHT, width: CANVAS_WIDTH }).touch(); 

//Q.setup({ maximize: true});

Q.input.keyboardControls({
    9: "tab",
    56: "zoomOut",
    57: "zoomIn",
    58: "zoomReset",
    16: "shift",
    77: "m",
    32: "space",
    191: "fslash"
});

Q.input.touchControls({
  controls:  [ ['left','<' ],
               ['right','>' ],
			   ['up','^' ],
               ['down','\/' ],
               [],
               ['action','b'],
               ['fire', 'a' ],
			   [],[]
			   ]
});

Q.controls();

var SCROLL_VELOCITY = 10;
var EPSILON = 10;
var DEFAULT_BUTTONS = [];
/*
    {label: "A"},
    {label: "B"},
    {label: "C"},
    {label: "D"},
    {label: "E"},
    {label: "F"}
];
*/

// component by Jacques Dés Prés
// https://plus.google.com/103224258695442602351/posts/UqpvNcCJo6Y
Q.component('stageTouchHandler', {
    added: function() {
        var self = this;
        Q.el.addEventListener("touchstart", function(e) {
            self.touch(e);
        });
        Q.el.addEventListener("mousedown", function(e) {
            self.touch(e);
        });
    },

    touch: function(e) {  //smurfs

        // @@TODO very brittle. see button.touch below.
        if( typeof IN_BUTTON_PRESS != "undefined" && IN_BUTTON_PRESS ) return;

        //this will process the touch event object and return a simple touch object
        var touch = Q.touchInput.normalizeTouch(e, this.entity);
        
        //this is a custom method which will return the x and y position at the center 
        // of the tile you touched.. read more below..
        var tilePosition = Q.touchTilePos(touch);
        
        //Now you can add your logic here to place something in the scene at that 
        // position... for example:
        if( Q.stage(2).options.unit ) {
            Q.stage(2).options.unit.setDestination(tilePosition);
        }
    }
});

//this function takes a touch, and will return the x and y tile coordinates for that 
// touch.  this does assume your tile size is 32x32
Q.touchTilePos = function(touch) {
    var tempX = Math.floor(touch.p.x / 32);
    var tempY = Math.floor(touch.p.y / 32);
    
    return {
        x: (tempX * 32) + 16,
        y: (tempY * 32) + 16                
    };
};

Q.TileLayer.extend("TerrainLayer");

Q.Sprite.extend("GenericObject", {
  init: function(p) {
      console.log(p);
    this._super(p, {sensor: true,
                    sheet: p.sprite
                   });
    this.on("sensor");
  },
  bump_top: function(collidedWith) {
      collidedWith.p.gravity = 0;
      collidedWith.p.vy = 0;
      console.log('foo');
  },
  sensor: function(collidedWith) {
    if( this.p.sprite == "ladder" && collidedWith instanceof Q.Unit
        &&
        collidedWith.p.destination ) {
        var y = collidedWith.p.destination.y,
            delta = collidedWith.p.y - y; // not abs'ing; we only want to go up if we want to go up
        foo = this;
        if( delta > EPSILON ) {
            collidedWith.p.climbing = true;
            collidedWith.p.vy = collidedWith.p.speed / -2;
            collidedWith.p.vx = 0;
            collidedWith.p.lockX = Math.floor(this.p.x / 32) * 32 + 16;
            collidedWith.p.gravity = 0;
        }
    }
  }
});

Q.Sprite.extend("Unit", {
  init: function(p, d) {
      var defaults = {
          buttons: DEFAULT_BUTTONS,
          speed: 100,
          climbing: null,
          type: 2,
          collisionMask: 1,
          destination: null,
          lockX: null
      };
      Q._defaults(d, defaults);
      this._super(p, d);
      this.add("2d");
      this.on("bump.left", "bumpLeft");
      this.on("bump.right", "bumpRight");
      this.on("bump.bottom", "bumpBottom");
  },
  getTilePosition: function() {
     return { x: Math.round((this.p.x - this.p.w / 2) / 32),
              y: Math.round((this.p.y - this.p.h / 2) / 32) };
  },
  foo: function(e, dir) {
      var obj = e.obj;
      if( obj instanceof Q.TerrainLayer ) {
          var pos = this.getTilePosition();
          if( this.directionX() == 0
              &&
              obj.getTile(pos.x, pos.y - 1) === null
              && 
              obj.getTile(pos.x + dir, pos.y - 1) === null ) {
              this.p.vy = this.p.speed / -2;
              this.p.gravity = 0;
              this.p.climbing = true;
          }
      }
  },
  bumpLeft: function(e) { return this.foo(e, -1); },
  bumpRight: function(e) { return this.foo(e, 1); },
  directionX: function() {
    if( this.p.vx ) {
        return this.p.vx / Math.abs(this.p.vx);
    }
    return 0;
  },
  bumpBottom: function(e) {
    if( e.obj instanceof Q.GenericObject && e.p.sprite == "bullshit1" ) {
        console.log("foo");
        this.p.gravity = 0;
        this.p.vy = 0;
    }
    if( this.p.climbing ) {
        this.p.gravity = 1;
        this.p.climbing = null;
        console.log("gotcha");
    }
  },
  step: function(dt) {
      var doStep = function() {
          if( !this.p.destination ) {
              return;
          }
          var x = this.p.destination.x,
              y = this.p.destination.y;
          var deltaX = Math.abs(this.p.x - x),
              deltaY = Math.abs(this.p.y - y);
          if( deltaX < EPSILON || deltaY < EPSILON ) {
              if( deltaX < EPSILON ) {
                  this.stop();
                  x = this.p.x;
              }
              if( deltaX < EPSILON && deltaY < EPSILON ) {
                  this.setDestination();
                  return;
              }
          }

          if( this.p.lockX != null ) {
              this.p.x = this.p.lockX;
              this.p.lockX = null;
              this.p.vy = 0;
          } else {
              if( x > this.p.x ) {
                  this.turnLeft();
              } else if( x < this.p.x ) {
                  this.turnRight();
              }
          }
      };
      doStep.bind(this)();
      this.p.climbing = false;
   },
  setDestination: function(dest) {
      this.p.climbing = false;
      this.p.gravity = 1;
      this.p.vy = 0;
      this.p.destination = dest;
  },
  stop: function() {
      this.p.vx = 0;
      if( this.p.destination ) {
          this.p.destination.x = this.p.x;
      }
  },
  turnLeft: function() {
      this.p.vx = this.p.speed;
  },
  turnRight: function() {
      this.p.vx = -this.p.speed;
  },

});

Q.Unit.extend("Archer", {
  init: function(p) {
      this._super(p, {
          hp: 10, 
          asset: "archer.png",
          buttons: [{label: "Shoot"}]
      });
  }
});
Q.Unit.extend("Engineer", {
  init: function(p) {
      this._super(p, {
          hp: 4,
          asset: "engineer.png",
          buttons: [{label: "Build"}]
      });
  }
});
Q.Unit.extend("Angel", {
  init: function(p) {
      this._super(p, {
          hp: 6,
          asset: "angel.png",
          buttons: [{label: "Bless"}, {label: "Curse"}]
      });
  }
});

Q.UI.TileButton = Q.UI.Button.extend("TileButton", {
    init: function(p, callback) {
        this._super(p, callback);
        this.on("touch", function(e) {
            // @@TODO: this is very brittle, and relies upon this event being fired first
            IN_BUTTON_PRESS = true;
            this.p.shadow = 0;
            this.p.y += 4;
            this.p.x += 2;
        });
        this.on("touchEnd", function() {
            IN_BUTTON_PRESS = null;
            this.p.shadow = 4;
            this.p.y -= 4;
            this.p.x -= 2;
        });
    }
});

Q.scene('active_unit_actions', function(stage) {

    var active_unit = stage.options.unit;

    if( !active_unit ) {
        stage.insert(new Q.UI.Text({label: "No unit selected",
                                    y: Q.height - 50,
                                    x: Q.width / 2,
                                    size: 34,
									color: "rgba(255,220,45,0.8)",
									family: "Times New Roman",
                                    weight: 400
                                   }));
        return;
    }

    var container = stage.insert(new Q.UI.Container({
        border: 2,
        fill: "white",
        stroke: "green"
    }));
    stage.insert(new Q.Sprite({ asset: active_unit.p.asset,
                                x: 25, y: Q.height - 46}),
                 container);
    container.fit(5, 5);

    var buttons = active_unit.p.buttons;

    for( var i=0; i<buttons.length; ++i ) {

        stage.insert(new Q.UI.TileButton({
            x: 75 + 25 + 1 + (i * 50) + (i * 3),
            y: Q.height - 50,
            w: 50, h: 50,
            fill: "lightgray",
            border: 1,
            shadow: 4,
            shadowColor: "rgba(0,0,0,0.5)",
            font: "12pt arial",
            label: buttons[i].label
        }, function() { console.log(this); }));
    }

});

Q.scene('battle', function(stage) {

    stage.options.gridW = 150;
    stage.options.gridH = 100;

    Q.stageTMX("test9.tmx", stage);

    var things = stage.items[1];

//    stage.remove(things);

    joe = stage.insert(new Q.Engineer({x: 32 * 6 + 16, y: 32 * 32 + 16 }));
    ally = stage.insert(new Q.Angel({x: 32 * 50 + 16, y: 32 * 42 + 16 }));
    //ted = stage.insert(new Q.Archer({x: 20, y: 2 }));
//	joe.p.x=1800;
//	joe.p.y=800;
//	ally.p.x=2000;
//	ally.p.y=1150;

//    stage.insert(things);

    stage.add("viewport");
    stage.add("stageTouchHandler");
	
	stage.viewport.x=1000;
	stage.viewport.y=1000;
	
    Q.input.on("zoomOut", function() {
        stage.viewport.scale *= 0.5;
    });
    Q.input.on("zoomIn", function() {
        stage.viewport.scale *= 2;
    });
    Q.input.on("zoomReset", function() {
        stage.viewport.scale = 1;
    });

    Q.input.on("tab", function() {
        var last = stage.viewport.following;
        stage.unfollow();
        stage.follow( last == joe ? ally : joe );
        Q.stageScene('active_unit_actions', 2, {unit: stage.viewport.following});
    });

    Q.input.on("left", stage, "unfollow");
    Q.input.on("right", stage, "unfollow");
    Q.input.on("down", stage, "unfollow");
    Q.input.on("up", stage, "unfollow");

    stage.on("step", function(dt) {
		//double tap jumps to edge of map.
		if(leftkey.check()){
			lastLeft=millisecondsL;
			timestamp = new Date();
			millisecondsL = timestamp.getTime();
			if(millisecondsL-lastLeft<160) {
				stage.viewport.x=-32;
			}
			
		}
		if(rightkey.check()){
			lastRight=millisecondsR;
			timestamp = new Date();
			millisecondsR = timestamp.getTime();
			if(millisecondsR-lastRight<160) {
				stage.viewport.x=3870;
			}
			
		}
		if(upkey.check()){
			lastUp=millisecondsU;
			timestamp = new Date();
			millisecondsU = timestamp.getTime();
			if(millisecondsU-lastUp<160) {
				stage.viewport.y=-32;
			}
			
		}
		if(downkey.check()){
			lastDown=millisecondsD;
			timestamp = new Date();
			millisecondsD = timestamp.getTime();
			if(millisecondsD-lastDown<160) {
				stage.viewport.y=2820;
			}
			
		}
        if( (Q.inputs['left']) ) {
			if( Q.inputs['shift'] ) {
				stage.viewport.x-= SCROLL_VELOCITY*2.5;
			}else
			{
				stage.viewport.x -= SCROLL_VELOCITY;
			}
        } else if( Q.inputs['right'] ) {
			if( Q.inputs['shift'] ) {
				stage.viewport.x += SCROLL_VELOCITY*2.5;
			}else {
				stage.viewport.x += SCROLL_VELOCITY;
			}
        } 		
        if( Q.inputs['up'] ) {
			if( Q.inputs['shift'] ) {
				stage.viewport.y -= SCROLL_VELOCITY*2.5;
			}else{
				stage.viewport.y -= SCROLL_VELOCITY;
			}
        } else if( Q.inputs['down'] ) {
			if( Q.inputs['shift'] ) {
				stage.viewport.y += SCROLL_VELOCITY*2.5;
			}else {
				stage.viewport.y += SCROLL_VELOCITY;
			}
        } 
	});
});

Q.loadTMX("test9.tmx, things.json", function() {
    Q.load(["archer.png", "engineer.png", "angel.png"], function() {
        Q.compileSheets("things.png", "things.json");
        Q.stageScene('battle');
        Q.stageScene('active_unit_actions', 2);
    });
});
