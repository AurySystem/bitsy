/*
	PAINT
*/

// TODO --- this object kind of sucks????
function DrawingId(type,id) { // TODO: is this the right name?
	var self = this;

	this.type = type;
	this.id = id;

	var imageSource = null;

	this.getFrameData = function(frameIndex) {
		if (imageSource === null || imageSource === undefined) {
			self.reloadImageSource();
		}

		return imageSource[ frameIndex ];
	}

	this.reloadImageSource = function() {
		if (renderer === null || renderer === undefined) {
			return;
		}

		// TODO RENDERER : pass in renderer?
		imageSource = (renderer.GetImageSource( self.toString() )).slice();
		console.log(imageSource);
	}

	this.updateImageSource = function() {
		if (imageSource === null || imageSource === undefined) {
			return;
		}

		renderer.SetImageSource(self.toString(), imageSource);
	}

	this.toString = function() {
		return tileTypeToIdPrefix(self.type) + self.id;
	}

	// note: can't believe I didn't make this before -- where else should I use it?
	this.getNameOrDescription = function() {
		console.log("NAME " + self.getEngineObject().name);
		return self.getEngineObject().name ? self.getEngineObject().name : tileTypeToString(self.type) + " " + self.id;
	}

	this.getDialogId = function() {
		var dialogId = null;
		if(self.type == TileType.Sprite) {
			dialogId = sprite[self.id].dlg;
		}
		else if(self.type == TileType.Item) {
			dialogId = item[self.id].dlg;
		}
		return dialogId;
	}

	this.getEngineObject = function() {
		if(self.type == TileType.Sprite || self.type == TileType.Avatar) {
			return sprite[self.id];
		}
		else if(self.type == TileType.Item) {
			return item[self.id];
		}
		else if(self.type == TileType.Tile) {
			return tile[self.id];
		}
		return null;
	}

	// TODO : these methods should really be moved DOWN an abstraction level into a core DRAWING object in bitsy.js
	this.getImage = function(palId,frameIndex) {
		if(self.type == TileType.Sprite || self.type == TileType.Avatar) {
			return getSpriteImage(sprite[self.id],palId,frameIndex);
		}
		else if(self.type == TileType.Item) {
			return getItemImage(item[self.id],palId,frameIndex);
		}
		else if(self.type == TileType.Tile) {
			return getTileImage(tile[self.id],palId,frameIndex);
		}
		return null;
	}

	this.draw = function(context,x,y,palId,frameIndex) {
		if(self.type == TileType.Sprite || self.type == TileType.Avatar) {
			return drawSprite(self.getImage(palId,frameIndex),x,y,context);
		}
		else if(self.type == TileType.Item) {
			return drawItem(self.getImage(palId,frameIndex),x,y,context);
		}
		else if(self.type == TileType.Tile) {
			return drawTile(self.getImage(palId,frameIndex),x,y,context);
		}
    }

    this.forceRerender = function (palId, flat) {
        if (self.type == TileType.Sprite || self.type == TileType.Avatar) {
            return renderer.RerenderImage(sprite[self.id], palId, flat);
        }
        else if (self.type == TileType.Item) {
            return renderer.RerenderImage(item[self.id], palId, flat);
        }
        else if (self.type == TileType.Tile) {
            return renderer.RerenderImage(tile[self.id], palId, flat);
        }
    }

    this.getThumbImage = function (palId, frameIndex) {
        if (self.type == TileType.Sprite || self.type == TileType.Avatar) {
            return renderer.GetImageThumb(sprite[self.id], palId, frameIndex);
        }
        else if (self.type == TileType.Item) {
            return renderer.GetImageThumb(item[self.id], palId, frameIndex);
        }
        else if (self.type == TileType.Tile) {
            return renderer.GetImageThumb(tile[self.id], palId, frameIndex);
        }
        return null;
    }
    this.drawThumb = function (context, x, y, palId, frameIndex) {
        return drawTileFlat(self.getThumbImage(palId, frameIndex), x, y, context);
    }

	this.isWallTile = function() {
		if(self.type != TileType.Tile)
			return false;

		// TODO
	}
}

// TODO
function PaintTool(canvas, roomTool) {
	// TODO : variables
	var self = this; // feels a bit hacky

	var paint_scale = 32;
    var curPaintColor;
    var paintColorDummy = 0;
	var curPaintBrush = 0;
	var isPainting = false;
	this.isCurDrawingAnimated = false; // TODO eventually this can be internal
	this.curDrawingFrameIndex = 0; // TODO eventually this can be internal
	this.drawPaintGrid = true;

	console.log("NEW PAINT TOOL");
	console.log(renderer);
	this.drawing = new DrawingId( TileType.Avatar, "A" );

	this.explorer = null; // TODO: hacky way to tie this to a paint explorer -- should use events instead

	//paint canvas & context
	canvas.width = tilesize * paint_scale;
	canvas.height = tilesize * paint_scale;
	var ctx = canvas.getContext("2d");

	// paint events
	canvas.addEventListener("mousedown", onMouseDown);
	canvas.addEventListener("mousemove", onMouseMove);
	canvas.addEventListener("mouseup", onMouseUp);
	canvas.addEventListener("mouseleave", onMouseUp);
	canvas.addEventListener("touchstart", onTouchStart);
	canvas.addEventListener("touchmove", onTouchMove);
	canvas.addEventListener("touchend", onTouchEnd);

	//painting color selector could be down better
	curPaintColor = document.getElementById("paintColor");
	curPaintColor.addEventListener("input", changePaintColor);
	curPaintColor.value = 1;

	// TODO : 
	function onMouseDown(e) {
		e.preventDefault();
		
		if (isPlayMode) {
			return; //can't paint during play mode
		}

		console.log("PAINT TOOL!!!");
		console.log(e);

		var off = getOffset(e);

		off = mobileOffsetCorrection(off,e,(tilesize));

		var x = Math.floor(off.x);
		var y = Math.floor(off.y);

		// non-responsive version
		// var x = Math.floor(off.x / paint_scale);
		// var y = Math.floor(off.y / paint_scale);

		if (curDrawingData()[y][x] == 0) {
			curPaintBrush = paintColorDummy;
		}
		else {
			curPaintBrush = 0;
		}
		curDrawingData()[y][x] = curPaintBrush;
		self.updateCanvas();
		isPainting = true;
	}

	function onMouseMove(e) {
		if (isPainting) {
			var off = getOffset(e);

			off = mobileOffsetCorrection(off,e,(tilesize));

			var x = Math.floor(off.x);// / paint_scale);
			var y = Math.floor(off.y);// / paint_scale);
			curDrawingData()[y][x] = curPaintBrush;
			self.updateCanvas();
		}
	}

	function onMouseUp(e) {
		console.log("?????");
		if (isPainting) {
			isPainting = false;
			updateDrawingData();
			refreshGameData();
			roomTool.drawEditMap(); // TODO : events instead of direct coupling

			if(self.explorer != null) {
				self.explorer.RenderThumbnail( self.drawing.id );
			}
			if( self.isCurDrawingAnimated ) {
				renderAnimationPreview( roomTool.drawing.id );
			}
		}
	}

	function onTouchStart(e) {
		e.preventDefault();
		var fakeEvent = { target:e.target, clientX:e.touches[0].clientX, clientY:e.touches[0].clientY };
		onMouseDown(fakeEvent);
	}

	function onTouchMove(e) {
		e.preventDefault();
		var fakeEvent = { target:e.target, clientX:e.touches[0].clientX, clientY:e.touches[0].clientY };
		onMouseMove(fakeEvent);
	}

	function onTouchEnd(e) {
		e.preventDefault();
		onMouseUp();
	}

	//hacky hacky pain in the butt
	function changePaintColor(e) {
        var testCol = e.target.value;
        console.log(testCol);
        testCol.replace(/[^0-9]/g, "");
        if (testCol.trim !== "") {
            console.log(testCol);
            if (testCol < getPal(curPal()).length) {
                curPaintColor.value = parseInt(testCol);
                if (curPaintColor.value == "NaN") {
                    curPaintColor.value = "";
                    paintColorDummy = 0;
                }
                else {
                    paintColorDummy = parseInt(testCol);
                }
            }
            else {
                curPaintColor.value = "";
                paintColorDummy = 0;
            }
        }
        else { paintColorDummy = 0;}
        console.log(paintColorDummy);
	}

	this.updateCanvas = function() {
		//background
		ctx.fillStyle = "rgb("+getPal(curPal())[0][0]+","+getPal(curPal())[0][1]+","+getPal(curPal())[0][2]+")";
		ctx.fillRect(0,0,canvas.width,canvas.height);

		var remap = 1;
		//remapped color
		if (self.drawing.type == TileType.Tile) {
			remap = tile[self.drawing.id].col;
		}
		else if (self.drawing.type == TileType.Sprite || self.drawing.type == TileType.Avatar) {
			remap = sprite[self.drawing.id].col;
		}
		else if (self.drawing.type == TileType.Item) {
			remap = item[self.drawing.id].col;
		}

		//draw pixels
		for (var x = 0; x < 8; x++) {
			for (var y = 0; y < 8; y++) {
				// draw alternate frame
				if (self.isCurDrawingAnimated && curDrawingAltFrameData()[y][x] != 0) {
					ctx.globalAlpha = 0.3;
					if (curDrawingAltFrameData()[y][x] != 1) {
						ctx.fillStyle = "rgb(" + getPal(curPal())[curDrawingAltFrameData()[y][x]][0] + "," + getPal(curPal())[curDrawingAltFrameData()[y][x]][1] + "," + getPal(curPal())[curDrawingAltFrameData()[y][x]][2] + ")";
					}
					else {
						ctx.fillStyle = "rgb(" + getPal(curPal())[remap][0] + "," + getPal(curPal())[remap][1] + "," + getPal(curPal())[remap][2] + ")";
					}
					ctx.fillRect(x * paint_scale, y * paint_scale, 1 * paint_scale, 1 * paint_scale);
					ctx.globalAlpha = 1;
				}
				// draw current frame
				if (curDrawingData()[y][x] != 0) {
					if (curDrawingData()[y][x] != 1) {
						ctx.fillStyle = "rgb(" + getPal(curPal())[curDrawingData()[y][x]][0] + "," + getPal(curPal())[curDrawingData()[y][x]][1] + "," + getPal(curPal())[curDrawingData()[y][x]][2] + ")";
					}
					else {
						ctx.fillStyle = "rgb(" + getPal(curPal())[remap][0] + "," + getPal(curPal())[remap][1] + "," + getPal(curPal())[remap][2] + ")";
					}
					ctx.fillRect(x*paint_scale,y*paint_scale,1*paint_scale,1*paint_scale);
				}
			}
		}

		//draw grid
		if (self.drawPaintGrid) {
			ctx.fillStyle = getContrastingColor();

			for (var x = 1; x < tilesize; x++) {
				ctx.fillRect(x*paint_scale,0*paint_scale,1,tilesize*paint_scale);
			}
			for (var y = 1; y < tilesize; y++) {
				ctx.fillRect(0*paint_scale,y*paint_scale,tilesize*paint_scale,1);
			}
		}
	}

	function curDrawingData() {
		var frameIndex = (self.isCurDrawingAnimated ? self.curDrawingFrameIndex : 0);
		return self.drawing.getFrameData(frameIndex);
	}

	// todo: assumes 2 frames
	function curDrawingAltFrameData() {
		var frameIndex = (self.curDrawingFrameIndex === 0 ? 1 : 0);
		return self.drawing.getFrameData(frameIndex);
	}

	// TODO : rename?
	function updateDrawingData() {
		self.drawing.updateImageSource();
	}

	// methods for updating the UI
	this.onReloadTile = null;
	this.onReloadSprite = null;
	this.onReloadItem = null;
	this.reloadDrawing = function() {
		self.drawing.reloadImageSource();

		if ( self.drawing.type === TileType.Tile) {
			if(self.onReloadTile) {
				self.onReloadTile();
			}
		}
		else if( self.drawing.type === TileType.Avatar || self.drawing.type === TileType.Sprite ) {
			if(self.onReloadSprite) {
				self.onReloadSprite();
			}
		}
		else if( self.drawing.type === TileType.Item ) {
			if(self.onReloadItem) {
				self.onReloadItem();
			}
		}
	}

	this.selectDrawing = function(drawingId) {
		self.drawing.id = drawingId.id; // have to do this hack because I'm relying on aliasing (not good!)
		self.drawing.type = drawingId.type;
		self.reloadDrawing();
		self.updateCanvas();
	}

	this.toggleWall = function(checked) {
		if( self.drawing.type != TileType.Tile )
			return;

		if( tile[ self.drawing.id ].isWall == undefined || tile[ self.drawing.id ].isWall == null ) {
			// clear out any existing wall settings for this tile in any rooms
			// (this is back compat for old-style wall settings)
			for( roomId in room ) {
				var i = room[ roomId ].walls.indexOf( self.drawing.id );
				if( i > -1 )
					room[ roomId ].walls.splice( i , 1 );
			}
		}

		tile[ self.drawing.id ].isWall = checked;

		refreshGameData();

		if(toggleWallUI != null && toggleWallUI != undefined) // a bit hacky
			toggleWallUI(checked);
	}

	this.changeCol = function (colID) {

		if (self.drawing.type == TileType.Tile) {
			tile[self.drawing.id].col = colID;
		}
		else if (self.drawing.type == TileType.Sprite || self.drawing.type == TileType.Avatar) {
			sprite[self.drawing.id].col = colID;
		}
		else if (self.drawing.type == TileType.Item) {
			item[self.drawing.id].col = colID;
		}
		refreshGameData();
	}

	this.getCurObject = function() {
		return self.drawing.getEngineObject();
	}

	this.newDrawing = function(imageData) {
		if ( self.drawing.type == TileType.Tile ) {
			newTile(imageData);
		}
		else if( self.drawing.type == TileType.Avatar || self.drawing.type == TileType.Sprite ) {
			newSprite(imageData);
		}
		else if( self.drawing.type == TileType.Item ) {
			newItem(imageData);
		}

		// update paint explorer
		self.explorer.AddThumbnail( self.drawing.id );
		self.explorer.ChangeSelection( self.drawing.id );
		document.getElementById("paintExplorerFilterInput").value = ""; // super hacky
		self.explorer.Refresh( self.drawing.type, true /*doKeepOldThumbnails*/, document.getElementById("paintExplorerFilterInput").value /*filterString*/, true /*skipRenderStep*/ ); // this is a bit hacky feeling
    }
    
    this.duplicateDrawing = function() {
        var sourceImageData = renderer.GetImageSource(self.drawing.toString());
        var copiedImageData = copyDrawingData(sourceImageData);

        // tiles have extra data to copy
        var tileIsWall = false;
        var tilePhysics = 0;
        if (self.drawing.type === TileType.Tile) {
            tileIsWall = tile[self.drawing.id].isWall;
            tilePhysics = tile[self.drawing.id].physics;
        }

        this.newDrawing(copiedImageData);

        // tiles have extra data to copy
        if (self.drawing.type === TileType.Tile) {
            tile[self.drawing.id].isWall = tileIsWall;
            tile[self.drawing.id].physics = tilePhysics;
            // make sure the wall toggle gets updated
            self.reloadDrawing();
        }
    }

	// TODO -- sould these newDrawing methods be internal to PaintTool?
	function newTile(imageData) {
		self.drawing.id = nextTileId();

		makeTile(self.drawing.id, imageData);
		self.reloadDrawing(); //hack for ui consistency (hack x 2: order matters for animated tiles)

		self.updateCanvas();
		refreshGameData();

		tileIndex = Object.keys(tile).length - 1;
	}

	function newSprite(imageData) {
		self.drawing.id = nextSpriteId();

		makeSprite(self.drawing.id, imageData);
		self.reloadDrawing(); //hack (order matters for animated tiles)

		self.updateCanvas();
		refreshGameData();

		spriteIndex = Object.keys(sprite).length - 1;
	}

	function newItem(imageData) {
		self.drawing.id = nextItemId();

		makeItem(self.drawing.id, imageData);
		self.reloadDrawing(); //hack (order matters for animated tiles)

		self.updateCanvas();
		updateInventoryItemUI();
		refreshGameData();

		itemIndex = Object.keys(item).length - 1;
	}

	// TODO - may need to extract this for different tools beyond the paint tool (put it in core.js?)
	this.deleteDrawing = function() {
		var shouldDelete = true;
		shouldDelete = confirm("Are you sure you want to delete this drawing?");

		if ( shouldDelete ) {
			self.explorer.DeleteThumbnail( self.drawing.id );

			if (self.drawing.type == TileType.Tile) {
				if ( Object.keys( tile ).length <= 1 ) { alert("You can't delete your last tile!"); return; }
				delete tile[ self.drawing.id ];
				findAndReplaceTileInAllRooms( self.drawing.id, "0" );
				refreshGameData();
				// TODO RENDERER : refresh images
				roomTool.drawEditMap();
				nextTile();
			}
			else if( self.drawing.type == TileType.Avatar || self.drawing.type == TileType.Sprite ){
				if ( Object.keys( sprite ).length <= 2 ) { alert("You can't delete your last sprite!"); return; }

				// todo: share with items
				var dlgId = sprite[ self.drawing.id ].dlg == null ? self.drawing.id : sprite[ self.drawing.id ].dlg;
				if( dlgId && dialog[ dlgId ] )
					delete dialog[ dlgId ];

				delete sprite[ self.drawing.id ];

				refreshGameData();
				// TODO RENDERER : refresh images
				roomTool.drawEditMap();
				nextSprite();
			}
			else if( self.drawing.type == TileType.Item ){
				if ( Object.keys( item ).length <= 1 ) { alert("You can't delete your last item!"); return; }

				var dlgId = item[ self.drawing.id ].dlg;
				if( dlgId && dialog[ dlgId ] )
					delete dialog[ dlgId ];

				delete item[ self.drawing.id ];

				removeAllItems( self.drawing.id );
				refreshGameData();
				// TODO RENDERER : refresh images
				roomTool.drawEditMap();
				nextItem();
				updateInventoryItemUI();
			}

			self.explorer.ChangeSelection( self.drawing.id );
		}
	}

	events.Listen("palette_change", function(event) {
		self.updateCanvas();

		if( self.isCurDrawingAnimated ) {
			// TODO -- this animation stuff needs to be moved in here I think?
			renderAnimationPreview( drawing.id );
		}
	});
}

