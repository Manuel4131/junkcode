// Depends on jQuery
// Depends on jQuery Media Plugin

( function() {

	// for JavaScript 1.6 compatibility
	if( !Array.prototype.map ) {
		Array.prototype.map = function( fun /*, thisp*/ ) {
			var len = this.length;
			if( typeof fun != "function" ) {
				throw new TypeError();
			}

			var res = new Array( len );
			var thisp = arguments[1];
			for( var i = 0; i < len; i++ ) {
				if( i in this ) {
					res[i] = fun.call( thisp, this[i], i, this );
				}
			}

			return res;
		};
	}

	var Blog = {

		blankTarget: true,

		openLink: function( e ) {
			if( Blog.blankTarget ) {
				e.preventDefault();
				window.open( $( e.target ).attr( 'href' ), '_blank' );
			}
		},

		targetLink: function( param ) {
			var toggle = $( param.id );
			if( toggle.length == 0 ){
				throw new Error( 'There is no element matched `' + param.id + '\' in this DOM!' );
			}

			toggle.text( param.dft ).click( function( e ) {
				e.preventDefault();
				$( this ).text( Blog.blankTarget ? param.ct : param.dft );
				Blog.blankTarget = !Blog.blankTarget;
			} );

			$( 'a[rel="external"]' ).bind( 'click.target', Blog.openLink );
		},

		/**
		 * @brief Hide blocks
		 * @param String selector CSS selector of blocks.
		 * @param String collapsed Collapsed element.
		 * @param String expanded Expanded element.
		 * @throw TypeError If any argument is wrong. Strong safety.
		 */
		hideBlocks: function( param ) {
			if( !( param.collapsed && param.expanded ) ) {
				throw new TypeError( 'Invalid argument(s).' );
			}
			var posts = $( param.selector );

			posts.each( function( index_, post ) {
				var more = $( param.collapsed );

				var less = $( param.expanded ).hide();

				more.click( function( e ) {
					$( [ post, this, less ] ).toggle();
				} );

				less.click( function( e ) {
					$( [ post, more, this ] ).toggle();
				} );

				$( this ).before( more ).after( less ).hide();
			} );
		},

		TagCloud: {

			cloudMin: 1,
			minFontSize: 10,
			maxFontSize: 20,
			minColor: [ 0xCC, 0xCC, 0xFF ],
			maxColor: [ 0x99, 0x99, 0xFF ],
			showCount: false,
			shuffle: true,

			generate: function( tags ) {
				function helper( a, b, i, x ) {
					if( a > b ) {
						return a - Math.floor( Math.log( i ) * ( a - b ) / Math.log( x ) );
					} else {
						return Math.floor( Math.log( i ) * ( b - a ) / Math.log( x ) + a );
					}
				}

				// 標籤的大小數量, 取得標籤的數量後做unique再取陣列長度
				var c = [];
				var rsk = [];
				( function( functor ) {
					jQuery.each( tags, function( key, value ) {
						// random shuffle or just copy. tags -> rsk
						functor( key );
						// unique array to c
						if( jQuery.inArray( value, c ) < 0 ) {
							c.push( value );
						}
					} );
				} )( Blog.TagCloud.shuffle ? function( key ) {
					rsk.splice( Math.floor( Math.random() * ( rsk.length + 1 ) ), 0, key );
				} : function( key ) {
					rsk.push( key );
				} );
				var labelCount = c.length;

				// color的rgb
				c = new Array( 3 );

				// 標籤數量底限
				var ta = this.cloudMin - 1;
				// 大小和顏色的總級數
				var tz = labelCount - this.cloudMin;
				// 放置標籤雲的元素
				var lc2 = $( '#labelCloud' );
				// 清單元素
				var ul = $( '<ul class="label-cloud"/>' );

				jQuery.each( rsk, function( index, key ) {
					// 當標籤文章數小於最底限時, 跳過這次的迭代( 由於每次的迭代都是function, 用return取代continue )
					if( tags[key] < Blog.TagCloud.cloudMin ) {
						return true;
					}
					// 取得顏色
					jQuery.each( c, function( index ) {
						c[index] = helper( Blog.TagCloud.minColor[index], Blog.TagCloud.maxColor[index], tags[key] - ta, tz );
					} );
					// 建立清單項目
					var li = $( '<li/>' ).css( {
						// 取得字體大小
						fontSize: helper( Blog.TagCloud.minFontSize, Blog.TagCloud.maxFontSize, tags[key] - ta, tz ) + 'px',
						lineHeight: '1em'
					} ).append( $( '<a>' + key + '</a>' ).attr( {
						href: [ location.protocol, null, location.host, 'search', 'label', encodeURIComponent( key ) ].join( '/' ),
						title: tags[key] + ' Post' + ( tags[key] > 1 ? 's' : '' ) + ' in ' + key
					} ).css( {
						color: 'rgb( ' + c.join( ', ' ) + ' )'
					} ) );
					// 項目加入連結
					// 如果設定顯示篇數的話
					if( Blog.TagCloud.showCount ) {
						// 加入項目(在連結元素之後)
						li.append( '<span class="label-count">(' + tags[key] + ')</span>' );
					}
					// 清單加入項目
					ul.append( li ).append( ' ' );
					// 間隔字元(美化)
				} );

				// 加入清單
				lc2.append( ul );
			}

		},

		highlighting: function( cbs ) {
			SyntaxHighlighter.config.clipboardSwf = cbs;
			SyntaxHighlighter.config.bloggerMode = true;
			//SyntaxHighlighter.all();
			SyntaxHighlighter.highlight();
		},

		Media: {
			video: true,
			image: true,

			trigger: function() {
				// processing image
				$( 'img.Media' ).each( function() {
					var shell = $( '\
						<div style="overflow: auto; width: 100%;">\
							<a href="' + $( this ).attr( 'src' ) + '" rel="external"/>\
						</div>\
					' );
					$( this ).after( shell ).appendTo( shell.children( ':first' ) );
				} );

				// processing video
				$.fn.media.defaults.bgColor = '#000000';
				$( 'a.Media' ).unbind( 'click.target' ).click( function( e ) {
					if( Blog.Media.video && !e.ctrlKey ) {
						e.preventDefault();
						$( this ).media();
					} else {
						Blog.openLink( e );
					}
				} );
				$( 'a.YouTube' ).unbind( 'click.target' ).click( function( e ) {
					if( Blog.Media.video && !e.ctrlKey ) {
						e.preventDefault();
						var temp = $( this ).attr( 'href' ).match( /http:\/\/\w+\.youtube\.com\/watch\?(\w)=([\w-]+)/ );
						if( temp == null ) {
							throw new Error( 'URL not match!' );
						}
						$( this ).media( {
							src: 'http://www.youtube.com/' + temp[1] + '/' + temp[2] + '&hl=zh_TW&fs=1',
							width: 425,
							height: 344,
							type: 'swf'
						} );
					} else {
						Blog.openLink( e );
					}
				} );
				$( 'a.GoogleVideo' ).click( function( e ) {
					if( Blog.Media.video && !e.ctrlKey ) {
						e.preventDefault();
						var self = $( this );
						var url = self.attr( 'href' );
						var temp = url.match( /http:\/\/video\.google\.com\/videoplay\?(\w+)=(.+)/ );
						url = 'http://video.google.com/googleplayer.swf?' + temp[1] + '=' + temp[2] + '&fs=true';

						self.before( $( '<embed allowFullScreen="true" src="' + url + '" type="application/x-shockwave-flash" />' ).width( self.attr( 'width' ) ).height( self.attr( 'height' ) ) ).remove();
					}
				} );
			}

		}

	};

	// for SyntaxHighlighter 3.0
	/*
	SyntaxHighlighter.autoloader.apply( null, [
		'bash          @/shBrushBash.js',
		'c cpp         @/shBrushCpp.js',
		'java          @/shBrushJava.js',
		'js javascript @/shBrushJScript.js',
		'ruby          @/shBrushRuby.js',
		'python        @/shBrushPython.js',
		'php           @/shBrushPhp.js'
	].map( function( path ) {
		return path.replace( '@', 'http://www2.cs.ccu.edu.tw/~pwc94u/lib/syntaxhighlighter/scripts' );
	} ) );
	*/
	SyntaxHighlighter.config.bloggerMode = true;
	SyntaxHighlighter.all();

	$( function() {
		// for link widgets
		$( '.LinkList a' ).attr( 'rel', 'external' );
		$( '.blog-list-container' ).removeAttr( 'target' ).attr( 'rel', 'external' );

		/* link target */
		Blog.targetLink( {
			id: '#toggle',
			dft: 'Open links in new window.',
			ct: 'Up to you.'
		} );

		/* hide posts */
		/*
		Blog.hideBlocks( {
			selector: '.stealth',
			collapsed: '<span class="switch" title="Expand Post">+More...</span>',
			expanded: '<span class="switch" title="Collapse Post">-Less...</span>'
		} );
		*/
		/* hide netabare */
		Blog.hideBlocks( {
			selector: '.netabare',
			collapsed: '<span class="switch" title="本區內容記述了大量原作情節，可能會降低您看原作時的樂趣">+ネタバレ</span>',
			expanded: '<span class="switch" title="隱藏捏他巴雷區">-ネタバレ</span>'
		} );
		/* hide media, from blog.js */
		Blog.Media.trigger();
	} );

} )();
