var Q = Quintus({ development: true });

Q.include("Sprites, Scenes, Input, UI, Touch, 2D, TMX");

//Q.gravityY = 0;

Q.setup({ height: 400, width: 1000 }).touch();

Q.input.keyboardControls({
    9: "tab",
    56: "zoomOut",
    57: "zoomIn",
    58: "zoomReset"
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

    touch: function(e) {

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

Q.Sprite.extend("Unit", {
  init: function(p, d) {
      var defaults = {
          buttons: DEFAULT_BUTTONS,
          speed: 20
      };
      Q._defaults(d, defaults);
      this._super(p, d);
      this.add("2d");
  },
  step: function(dt) {
      if( !this.p.destination ) {
          return;
      }
      var x = this.p.destination.x,
          y = this.p.destination.y;
      var delta = Math.abs(this.p.x - x);
      if( delta < EPSILON ) {
          this.setDestination();
          this.stop();
          return;
      }
      if( x > this.p.x ) {
          this.turnLeft();
      } else {
          this.turnRight();
      }
  },
  setDestination: function(dest) {
      this.p.destination = dest;
  },
  stop: function() {
      this.p.vx = 0;
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
        stage.insert(new Q.UI.Text({label: "No unit is selected",
                                    y: Q.height - 50,
                                    x: Q.width / 2,
                                    size: 16,
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

    Q.stageTMX("test5.tmx", stage);

    var joe = stage.insert(new Q.Engineer({x: 1450, y: 1400 }));
    var ally = stage.insert(new Q.Angel({x: 1050, y: 400 }));

    stage.add("viewport");
    stage.add("stageTouchHandler");

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
        if( Q.inputs['left'] ) {
            stage.viewport.x -= SCROLL_VELOCITY;
        } else if( Q.inputs['right'] ) {
            stage.viewport.x += SCROLL_VELOCITY;
        } 
        if( Q.inputs['up'] ) {
            stage.viewport.y -= SCROLL_VELOCITY;
        } else if( Q.inputs['down'] ) {
            stage.viewport.y += SCROLL_VELOCITY;
        } 
    });
});

Q.loadTMX("test5.tmx", function() {
    Q.load(["archer.png", "engineer.png", "angel.png"], function() {
        Q.stageScene('battle');
        Q.stageScene('active_unit_actions', 2);
    });
});
