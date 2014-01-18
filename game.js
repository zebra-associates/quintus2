Quintus.MyAI = function(Q) {
    Q.component("myAI", {
        added: function(p) {
            this.entity.p.vx = 100;
            this.on("bump.left", this, "jumpLeft");
            this.on("bump.right", this, "jumpRight");
            this.entity.on("step", this, "maybeFireWeapon");
        },
        destroyed: function() {
            this.off("bump.left", this, "jumpLeft");
            this.off("bump.right", this, "jumpRight");
            this.entity.off("step", this, "maybeFireWeapon");
        },
        maybeFireWeapon: function() {
            var rn = Math.random() * 10;
            if( rn < 0.5 ) {
                this.entity.fireWeapon();
            }
        },
        jump: function(collision) {
            this.p.vy -= 300;
        },
        jumpLeft: function(collision) {
            if( this.p.vx > 0 && this.p.vy == 0 ) { this.jump(collision); }
        },
        jumpRight: function(collision) {
            if( this.p.vx < 0  && this.p.vy == 0 ) { this.jump(collision); }
        }
    });

    Q.component("player", {
        added: function() {
            this.entity.fireWeapon = this.entity.fireWeapon || function() { };
            Q.input.on("fire", this.entity, "fireWeapon");
        },
        destroyed: function() {
            Q.input.off("fire", this.entity, "fireWeapon");
        }
    });
    Q.component("zeroGravityControls", {
        defaults: {
            speed: 200,
            jumpSpeed: -300
        },

        added: function() {
            var p = this.entity.p;
            
            Q._defaults(p,this.defaults);
            
            this.entity.on("step",this,"step");
            this.entity.on("bump.bottom",this,"landed");
            
            p.landed = 0;
            p.direction ='right';
        },
        
        landed: function(col) {
            var p = this.entity.p;
            p.landed = 1/5;
        },
        
        step: function(dt) {
            var p = this.entity.p;
            
            if(Q.inputs['left']) {
                p.vx = -p.speed;
                p.direction = 'left';
            } else if(Q.inputs['right']) {
                p.direction = 'right';
                p.vx = p.speed;
            } else {
                p.vx = 0;
            }
            if(Q.inputs['up']) {
                p.direction = 'up';
                p.vy = -p.speed;
            } else if(Q.inputs['down']) {
                p.direction = 'down';
                p.vy = p.speed;
            }
            
        }
    });

    Q.component("floorBreaker", {
        added: function() {
            this.entity.p.floorTile = floorTile(this.entity);
            this.entity.on("step", this, "breakFloor");            
        },
        destroyed: function() {
            this.entity.off("step", this, "breakFloor");
        },
        breakFloor: function() {
            var ft = floorTile(this.entity);
            if( ft.x == this.entity.p.floorTile.x && 
                ft.y == this.entity.p.floorTile.y ) {
                return;
            }
            this.entity.p.floorTile = ft;
            if( Q.stage()._collisionLayer.getTile(ft.x, ft.y) == 1 ) {
                Q.stage()._collisionLayer.setTile(ft.x, ft.y, 3);
            } else if( Q.stage()._collisionLayer.getTile(ft.x, ft.y) == 3 ) {
                Q.stage()._collisionLayer.setTile(ft.x, ft.y, 0);
            }
        }
    });

    Q.component("projectile", {
        added: function() {
            this.entity.on("hit", function(collision) {
                if( collision.obj.person && collision.obj.team != this.p.owner_team ) {
                    Q.stage().people.pop(Q.stage().people.indexOf(collision.obj));
                    collision.obj.destroy();
                }
                if( !this.isA("Bomb") ) this.destroy();
            });
        },
    });
};

var Q = Quintus({ development: true }).include("Sprites, Scenes, Input, 2D, Anim, MyAI")
    .setup({ height: 500, width: 500, maximize: false });

Q.input.keyboardControls({
    9: "tab",
    56: "zoomOut",
    57: "zoomIn",
    58: "zoomReset"
});

Q.controls();


Q.Sprite.extend("Engineer", {
    init: function(p) {
        this.controlComponent = "platformerControls";
        this.person = true;
        this.team = "blue";
        this._super(p, {
            "asset": "engineer.png"
        });
        this.add("2d, aiBounce, myAI, floorBreaker");
    },
    fireWeapon: function() {
        var direction = this.p.direction === "left" ? -1 : 1;
        Q.stage()._collisionLayer.setTile(
            Math.ceil(this.p.x / 32) + direction,
            Math.ceil(this.p.y / 32),
            2);
    }
});

function floorTile(sprite) {
    var col = Q.stage()._collisionLayer,
        p = sprite.p;
    return { x: Math.round((p.x - p.w / 2) / 32),
             y: Math.ceil((p.y + p.h / 2) / 32) };
};

Q.Sprite.extend("Angel", {
    init: function(p) {
        this.controlComponent = "zeroGravityControls";
        this.person = true;
        this.team = "red";
        this._super(p, {
            asset: "angel.png",
            gravity: 0
        });
        this.p.floorTile = floorTile(this);
        this.add("2d, zeroGravityControls, player");
    },
    fireWeapon: function() {
        var direction = this.p.vx / Math.abs(this.p.vx);
        if( isNaN(direction) ) { 
            direction = 1;
        } 
        Q.stage().insert(new Q.Bomb({ 
            vx: 0, 
            vy: 0,
            x: this.p.x,
            y: this.p.y + this.p.h,
            owner_team: this.team
        }));
    }

});

Q.Sprite.extend("Arrow", {
    init: function(p) {
        this._super(p, { asset: "arrow.png", gravity: 0.3 });
        this.add("2d, projectile");
    }
});
Q.Sprite.extend("Bomb", {
    init: function(p) {
        this._super(p, { asset: "arrow.png", gravity: 0.5 });
        this.add("2d, projectile, tween");
        this.timer = 0;
        this.on("bump.bottom", this.explode);
        this.on("step", function() {
            this.timer += 1;
            if( this.timer > 20 ) {
                this.explode();
            }
        });
    },
    explode: function() {
        if( this.exploding ) return;
        this.exploding = true;
        this.asset("explosion0.png");
        this.animate({"angle": 360,
                      }, 0.2, Q.Easing.Linear, {
                          "callback": this.destroy 
                      });
        Q.stage()._collisionLayer.setTile(
            Math.floor(this.p.x / 32 - 1), 
            Math.floor(this.p.y / 32 + 1),
            0);
        Q.stage()._collisionLayer.setTile(
            Math.floor(this.p.x / 32), 
            Math.floor(this.p.y / 32 + 1),
            0);
        Q.stage()._collisionLayer.setTile(
            Math.ceil(this.p.x / 32), 
            Math.floor(this.p.y / 32 + 1),
            0);
    }
});

Q.Sprite.extend("Archer", {
    init: function(p) {
        this.controlComponent = "platformerControls";
        this.person = true;
        this.team = "blue";
        this._super(p, { asset: "archer.png", vx: 100 });
        this.add("2d, aiBounce, myAI");
    },
    fireWeapon: function() {
        var direction = this.p.vx / Math.abs(this.p.vx);
        if( isNaN(direction) ) { 
            direction = 1;
        } 
        Q.stage().insert(new Q.Arrow({ 
            vx: direction * 250, 
            vy: -100,
            x: this.p.x + (direction * this.p.w) + 2 * direction,
            y: this.p.y,
            owner_team: this.team
        }));
    }
});
    
Q.scene("level1", function(stage) {
    stage.collisionLayer(new Q.TileLayer({ dataAsset: 'level.json', sheet: 'tiles' }));


    stage.people = [new Q.Angel({ x: 1000, y: 3000 }),
                    new Q.Archer({ x: 0, y: 100 }),
                    new Q.Engineer({ x: 100, y: 100 })
                   ];
    for( var i=0; i<stage.people.length; ++i ) {
        stage.insert(stage.people[i]);
    }
    stage.add("viewport").follow(stage.people[0]);

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
        stage.viewport.following.del("player");
        stage.viewport.following.del(stage.viewport.following.controlComponent);
        stage.viewport.following.add("myAI, aiBounce");
        var idx = stage.people.indexOf(stage.viewport.following) + 1;
        if( idx >= stage.people.length ) {
            idx = 0;
        }
        stage.viewport.following = stage.people[idx];
        stage.viewport.following.del("myAI, aiBounce");
        stage.viewport.following.add("player");
        stage.viewport.following.add(stage.viewport.following.controlComponent);
    });
});

Q.load("arrow.png, angel.png, archer.png, level.json, tiles.png, explosion0.png, engineer.png", 
       function() {
    Q.sheet("tiles","tiles.png", { tilew: 32, tileh: 32 });
    Q.stageScene("level1");
});
