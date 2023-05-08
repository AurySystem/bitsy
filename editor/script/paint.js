/*
	PAINT
*/
function drawGrid(canvas, gridDivisions, lineColor) {
	var ctx = canvas.getContext("2d");
	ctx.fillStyle = lineColor;

	var gridSize = canvas.width; // assumes width === height
	var gridSpacing = (gridSize / gridDivisions);

	// vertical lines
	for (var x = 1; x < gridDivisions; x++) {
		ctx.fillRect(x * gridSpacing, 0 * gridSpacing, 1, gridSize);
	}

	// horizontal lines
	for (var y = 1; y < gridDivisions; y++) {
		ctx.fillRect(0 * gridSpacing, y * gridSpacing, gridSize, 1);
	}
}

function PaintTool(canvas, menuElement) {
	// TODO : variables
	var self = this; // feels a bit hacky

	var defaultTilesize = this.curTilesize = 8;
    var defaultPaintScale = this.curPaintScale = 32;

    var curPaintColor;
    var paintColorDummy = 1;
	var curPaintBrush = 0;
	var isPainting = false;
	this.isCurDrawingAnimated = false; // TODO eventually this can be internal
	this.curDrawingFrameIndex = 0; // TODO eventually this can be internal
	this.drawPaintGrid = (getPanelSetting("paintPanel", "grid") != false);
	updatePaintGridCheck(this.drawPaintGrid);

	//paint canvas & context
	canvas.width = defaultTilesize * defaultPaintScale;
	canvas.height = defaultTilesize * defaultPaintScale;
	var ctx = canvas.getContext("2d");

	// paint events
	canvas.addEventListener("mousedown", onMouseDown);
	canvas.addEventListener("mousemove", onMouseMove);
	canvas.addEventListener("mouseup", onMouseUp);
	canvas.addEventListener("mouseleave", onMouseUp);
	canvas.addEventListener("touchstart", onTouchStart);
	canvas.addEventListener("touchmove", onTouchMove);
	canvas.addEventListener("touchend", onTouchEnd);

	this.updateCurTilesize = function () {
        var newTilesize = getDrawingFrameData(drawing, 0).length;
		self.curTilesize = newTilesize;
		self.curPaintScale = defaultPaintScale / (newTilesize / defaultTilesize);
    };

	//painting color selector could be down better
	curPaintColor = document.getElementById("paintColor");
	curPaintColor.addEventListener("input", changePaintColor);
	curPaintColor.value = 1;

    this.setPaintColor = function (index) {
        index = parseInt(index);
        curPaintColor.value = index;
        paintColorDummy = index;
    }

	// TODO : 
	function onMouseDown(e) {
		e.preventDefault();
		
		if (isPlayMode) {
			return; //can't paint during play mode
		}

		bitsyLog("PAINT TOOL!!!", "editor");
		bitsyLog(e, "editor");

		var off = getOffset(e);

		off = mobileOffsetCorrection(off,e,(self.curTilesize));

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

			off = mobileOffsetCorrection(off,e,(self.curTilesize));

			var x = Math.floor(off.x);// / paint_scale);
			var y = Math.floor(off.y);// / paint_scale);
			curDrawingData()[y][x] = curPaintBrush;
			self.updateCanvas();
		}
	}

	function onMouseUp(e) {
		bitsyLog("?????", "editor");
		if (isPainting) {
			isPainting = false;

			// force tile to re-render
			// renderer.ClearCache();
			// renderer.DeleteDrawing(drawing);
			if (roomTool) {
				// roomTool.renderer.ClearCache();
				roomTool.select(roomTool.getSelected());
			}

			updateDrawingData();
			refreshGameData();

			self.updateCanvas();

			if (self.isCurDrawingAnimated) {
				renderAnimationPreview(drawing);
			}

			events.Raise("paint_edit");
		}
	}

	function onTouchStart(e) {
		e.preventDefault();
		// update event to translate from touch-style to mouse-style structure
		e.clientX = e.touches[0].clientX;
		e.clientY = e.touches[0].clientY;
		onMouseDown(e);
	}

	function onTouchMove(e) {
		e.preventDefault();
		// update event to translate from touch-style to mouse-style structure
		e.clientX = e.touches[0].clientX;
		e.clientY = e.touches[0].clientY;
		onMouseMove(e);
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
		// get palette of selected room
		var selectedRoomId = state.room;
		if (roomTool) {
			selectedRoomId = roomTool.getSelected();
		}
		if (room[selectedRoomId] === undefined) {
			selectedRoomId = "0";
		}

		var palId = room[selectedRoomId].pal;
		var palColors = getPal(palId);

		//background
		ctx.fillStyle = "rgb(" + palColors[0][0] + "," + palColors[0][1] + "," + palColors[0][2] + ")";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		var remap = 1;
		//remapped color
		if (drawing.type == TileType.Tile) {
			remap = tile[drawing.id].col;
		}
		else if (drawing.type == TileType.Sprite || drawing.type == TileType.Avatar) {
			remap = sprite[drawing.id].col;
		}
		else if (drawing.type == TileType.Item) {
			remap = item[drawing.id].col;
        }

        var remappedColor = [0,0,0]

        if (typeof (remap) == 'string') {
            var temp = hexToRgb(remap);
            remappedColor[0] = temp.r;
            remappedColor[1] = temp.g;
            remappedColor[2] = temp.b;
        } else {
            remappedColor = getPal(curPal())[remap];
        }

		//draw pixels
		for (var x = 0; x < self.curTilesize; x++) {
			for (var y = 0; y < self.curTilesize; y++) {
				// draw alternate frame
                if (self.isCurDrawingAnimated && curDrawingAltFrameData()[y][x] != 0 && curDrawingAltFrameData()[y][x] < getPal(curPal()).length && !isNaN(parseInt(curDrawingAltFrameData()[y][x]))) {
                    ctx.globalAlpha = 0.3;

					if (curDrawingAltFrameData()[y][x] != 1) {
						ctx.fillStyle = "rgb(" + getPal(curPal())[curDrawingAltFrameData()[y][x]][0] + "," + getPal(curPal())[curDrawingAltFrameData()[y][x]][1] + "," + getPal(curPal())[curDrawingAltFrameData()[y][x]][2] + ")";
					}
					else {
                        ctx.fillStyle = "rgb(" + remappedColor[0] + "," + remappedColor[1] + "," + remappedColor[2] + ")";
					}

					ctx.fillRect(x*self.curPaintScale,y*self.curPaintScale,1*self.curPaintScale,1*self.curPaintScale);
					ctx.globalAlpha = 1;
				}
				// draw current frame
                if (curDrawingData()[y][x] != 0 && curDrawingData()[y][x] < getPal(curPal()).length && !isNaN(parseInt(curDrawingData()[y][x]))) {
					if (curDrawingData()[y][x] != 1) {
						ctx.fillStyle = "rgb(" + getPal(curPal())[curDrawingData()[y][x]][0] + "," + getPal(curPal())[curDrawingData()[y][x]][1] + "," + getPal(curPal())[curDrawingData()[y][x]][2] + ")";
					}
                    else {
                        ctx.fillStyle = "rgb(" + remappedColor[0] + "," + remappedColor[1] + "," + remappedColor[2] + ")";
					}
					ctx.fillRect(x*self.curPaintScale,y*self.curPaintScale,1*self.curPaintScale,1*self.curPaintScale);
				}
			}
		}

		// draw grid
		if (self.drawPaintGrid) {
			drawGrid(canvas, self.curTilesize, getContrastingColor());
		}
    }

    this.flipDrawing = function (direction) {
        var curDrawingCopy = curDrawingData().map(function (x) { return x.slice() });
        for (var x = 0; x < self.curTilesize; x++) {
            for (var y = 0; y < self.curTilesize; y++) {
                var ypos = self.curTilesize - y - 1;
                var xpos = self.curTilesize - x - 1;
                if (direction == 0) {
                    curDrawingData()[y][x] = curDrawingCopy[ypos][x];
                } else {
                    curDrawingData()[y][x] = curDrawingCopy[y][xpos];
                }
            }
        }
        self.updateCanvas();
        updateDrawingData();
        refreshGameData();
        roomTool.drawEditMap();
    }

    this.rotateDrawing = function (direction) {
        var curDrawingCopy = curDrawingData().map(function (x) { return x.slice() });
        for (var x = 0; x < self.curTilesize; x++) {
            for (var y = 0; y < self.curTilesize; y++) {
                curDrawingData()[y][x] = curDrawingCopy[x][y];
            }
        }
        self.flipDrawing(direction);
        self.updateCanvas();
    }

    this.nudgeDrawing = function (direction) {
        var curDrawingCopy = curDrawingData().map(function(x) {return x.slice() });
        var addx = 0;
        var addy = 0;
        switch (direction) {
            case 0://left
                addx = 1;
                break;
            case 1://right
                addx = -1;
                break;
            case 2://up
                addy = 1;
                break;
            case 3://down
                addy = -1;
                break;
        }
        var maxTile = self.curTilesize - 1;
        for (var x = 0; x < self.curTilesize; x++) {
            for (var y = 0; y < self.curTilesize; y++) {
                var ypos = y + addy;
                var xpos = x + addx;
                if (ypos < 0) { ypos = ypos + self.curTilesize; } else if (ypos > maxTile) { ypos = ypos - self.curTilesize; }
                if (xpos < 0) { xpos = xpos + self.curTilesize; } else if (xpos > maxTile) { xpos = xpos - self.curTilesize; }
                curDrawingData()[y][x] = curDrawingCopy[ypos][xpos];
            }
        }
        self.updateCanvas();
        updateDrawingData();
        refreshGameData();
        roomTool.drawEditMap();
    }

    this.mirrorDrawing = function (direction) {
        var curDrawingCopy = curDrawingData().map(function (x) { return x.slice() });
        var maxTile = self.curTilesize - 1;
        var mirror = maxTile / 2;
        console.log(maxTile + " mirrorpoint: " + mirror);
        switch (direction) {
            case 0://left to right
                for (var x = 0; x < self.curTilesize; x++) {
                    for (var y = 0; y < self.curTilesize; y++) {
                        var ypos = y;
                        var xpos = x;
                        if (xpos < mirror) { xpos = self.curTilesize - x - 1; }
                        curDrawingData()[y][x] = curDrawingCopy[ypos][xpos];
                    }
                }
                break;
            case 1://right to left
                for (var x = 0; x < self.curTilesize; x++) {
                    for (var y = 0; y < self.curTilesize; y++) {
                        var ypos = y;
                        var xpos = x;
                        if (xpos > mirror) { xpos = self.curTilesize - x - 1; }
                        curDrawingData()[y][x] = curDrawingCopy[ypos][xpos];
                    }
                }
                break;
            case 2://up to down
                for (var x = 0; x < self.curTilesize; x++) {
                    for (var y = 0; y < self.curTilesize; y++) {
                        var ypos = y;
                        var xpos = x;
                        if (ypos < mirror) { ypos = self.curTilesize - y - 1; }
                        curDrawingData()[y][x] = curDrawingCopy[ypos][xpos];
                    }
                }
                break;
            case 3://down to up
                for (var x = 0; x < self.curTilesize; x++) {
                    for (var y = 0; y < self.curTilesize; y++) {
                        var ypos = y;
                        var xpos = x;
                        if (ypos > mirror) { ypos = self.curTilesize - y - 1; }
                        curDrawingData()[y][x] = curDrawingCopy[ypos][xpos];
                    }
                }
                break;
        }
        self.updateCanvas();
        updateDrawingData();
        refreshGameData();
        roomTool.drawEditMap();
    }

	function curDrawingData() {
		var frameIndex = (self.isCurDrawingAnimated ? self.curDrawingFrameIndex : 0);
		return getDrawingFrameData(drawing, frameIndex);
	}

	// todo: assumes 2 frames
	function curDrawingAltFrameData() {
		var frameIndex = (self.curDrawingFrameIndex === 0 ? 1 : 0);
		return getDrawingFrameData(drawing, frameIndex);
	}

	// TODO : rename?
	function updateDrawingData() {
		// this forces a renderer cache refresh but it's kind of wonky
		renderer.SetDrawingSource(drawing.drw, getDrawingImageSource(drawing));
	}

	// todo: this is a *mess* - I really need to refactor it (someday)
	// methods for updating the UI
	this.onReloadTile = null;
	this.onReloadSprite = null;
	this.onReloadItem = null;
	this.reloadDrawing = function() {
		self.updateCurTilesize();

		if (drawing.type === TileType.Tile) {
			if (self.onReloadTile) {
				self.onReloadTile();
			}
		}
		else if (drawing.type === TileType.Avatar || drawing.type === TileType.Sprite) {
			if (self.onReloadSprite) {
				self.onReloadSprite();
			}
		}
		else if (drawing.type === TileType.Item) {
			if (self.onReloadItem) {
				self.onReloadItem();
			}
		}

		// hack to force update of new menu
		self.menu.update();
	}

	this.selectDrawing = function(drawingData) {
		drawing = drawingData; // ok this global variable is weird imo
		self.reloadDrawing();
		self.updateCanvas();
	}

	this.toggleWall = function(checked) {
		if (drawing.type != TileType.Tile) {
			return;
		}

		if (drawing.isWall == undefined || drawing.isWall == null) {
			// clear out any existing wall settings for this tile in any rooms
			// (this is back compat for old-style wall settings)
			for (roomId in room) {
				var i = room[roomId].walls.indexOf(drawing.id);

				if (i > -1) {
					room[roomId].walls.splice(i, 1);
				}
			}
		}

		drawing.isWall = checked;

		refreshGameData();

		if (toggleWallUI != null && toggleWallUI != undefined) { // a bit hacky
			toggleWallUI(checked);
		}
	}

	this.changeCol = function (colID) {

		if (drawing.type == TileType.Tile) {
			tile[drawing.id].col = colID;
		}
		else if (drawing.type == TileType.Sprite || drawing.type == TileType.Avatar) {
			sprite[drawing.id].col = colID;
		}
		else if (drawing.type == TileType.Item) {
			item[drawing.id].col = colID;
		}
		refreshGameData();
	}

	this.getCurObject = function() {
		return drawing;
	}

	this.newDrawing = function(imageData) {
		if (drawing.type === TileType.Tile) {
			newTile(imageData);
		}
		else if (drawing.type === TileType.Avatar || drawing.type === TileType.Sprite) {
			newSprite(imageData);
		}
		else if (drawing.type === TileType.Item) {
			newItem(imageData);
		}
	}
	
	this.duplicateDrawing = function() {
		var sourceImageData = getDrawingImageSource(drawing);
		var copiedImageData = copyDrawingData(sourceImageData);

		// tiles have extra data to copy
		var tileIsWall = false;
		if (drawing.type === TileType.Tile) {
			tileIsWall = drawing.isWall;
		}

		this.newDrawing(copiedImageData);

		// tiles have extra data to copy
		if (drawing.type === TileType.Tile) {
			drawing.isWall = tileIsWall;
			// make sure the wall toggle gets updated
			self.reloadDrawing();
		}
	}

	// TODO -- sould these newDrawing methods be internal to PaintTool?
	function newTile(imageData) {
		var id = nextTileId();
		makeTile(id, imageData);

		drawing = tile[id];
		self.reloadDrawing(); //hack for ui consistency (hack x 2: order matters for animated tiles)

		self.updateCanvas();
		refreshGameData();

		tileIndex = Object.keys(tile).length - 1;
	}

	function newSprite(imageData) {
		var id = nextSpriteId();
		makeSprite(id, imageData);

		drawing = sprite[id];
		self.reloadDrawing(); //hack (order matters for animated tiles)

		self.updateCanvas();
		refreshGameData();

		spriteIndex = Object.keys(sprite).length - 1;
	}

	function newItem(imageData) {
		var id = nextItemId();
		makeItem(id, imageData);

		drawing = item[id];
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

		if (shouldDelete) {
			if (drawing.type === TileType.Tile) {
				if (Object.keys( tile ).length <= 1) {
					alert("You can't delete your last tile!"); // todo : localize
					return;
				}

				delete tile[drawing.id];

				findAndReplaceTileInAllRooms(drawing.id, "0");
				refreshGameData();

				nextTile();
			}
			else if (drawing.type === TileType.Avatar || drawing.type === TileType.Sprite) {
				if (Object.keys(sprite).length <= 2) {
					alert("You can't delete your last sprite!"); // todo : localize
					return;
				}

				// todo: share with items
				var dlgId = (drawing.dlg === null) ? drawing.id : drawing.dlg;

				delete sprite[drawing.id];

				deleteUnreferencedDialog(dlgId);
				refreshGameData();

				nextSprite();
			}
			else if (drawing.type === TileType.Item) {
				if (Object.keys(item).length <= 1) {
					alert("You can't delete your last item!"); // todo : localize
					return;
				}

				var dlgId = drawing.dlg;

				delete item[drawing.id];

				deleteUnreferencedDialog(dlgId);
				removeAllItems(drawing.id);
				refreshGameData();

				nextItem();
				updateInventoryItemUI();
			}
		}
	}

	events.Listen("palette_change", function(event) {
		self.updateCanvas();

		if (self.isCurDrawingAnimated) {
			// TODO -- this animation stuff needs to be moved in here I think?
			renderAnimationPreview(drawing);
		}
	});

	/* NEW MENU */
	this.menuElement = menuElement;

	this.menuUpdate = function() {
		if (drawing.type != TileType.Tile && drawing.type != TileType.Avatar) {
			self.menu.push({ control: "group" });
			self.menu.push({ control: "label", icon: "blip", description: "blip (sound effect)" });
			self.menu.push({
				control: "select",
				data: "BLIP",
				noneOption: "none",
				value: drawing.blip,
				onchange: function(e) {
					if (e.target.value === "null") { // always a string :(
						drawing.blip = null;
					}
					else {
						drawing.blip = e.target.value;
					}
					refreshGameData();
				}
			});
			self.menu.pop({ control: "group" });
		}
	};

	this.menu = new MenuInterface(this);
}

