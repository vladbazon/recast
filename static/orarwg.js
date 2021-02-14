(function($) {
    function BAR() {
        var bar = [
            '<p id="tools-bar">',
                '<button title="(re)încarcă orarul iniţial">Load</button>',
                '<input value="9A"><button title="profesorii şi orele clasei">Mark</button>',
                '<button>swap</button>',
                '<button title="anulează ultima "swap"">undo</button>',
                '<a title="salvează orarul curent">Export</a>',
                'gaps: <span></span>&thinsp;|<span></span>',
            '</p>',
            '<div id="grid-orar">',
                '<table border="1" cellspacing="2" cellpadding="2"></table>',
            '</div>'
        ];
        return $(bar.join(''));
    };
    
    var one_gap = /\w[-~]\w/g;    // identifică o fereastră
    var two_gap = /\w[-~]{2}\w/g; // două ferestre consecutive

    function gaps(ore) { // listă ca ['nume','-','-','12C','-','12E',...]
        var sore = ore.slice(1).join(''); // şirul '--12C-12E...'
        var gap1 = sore.match(one_gap); // tabloul ferestrelor de câte o oră
        var gap2 = sore.match(two_gap); // tabloul ferestrelor de câte 2 ore
        var g1 = gap1? gap1.length : 0;
        var g2 = gap2? 2 * gap2.length : 0;
        return g1 + g2; // numărul total de ferestre
    };
    
    function SWAP(td1, td2) {
        var x1 = td1.text(), x2 = td2.text();
        td1.text(x2);
        td2.text(x1);
    };

   
    $.widget("vb.orarwg", {
        _create: function() { 
            BAR().insertAfter(this.element);
            this.orar = [];
            this.spread = {};
            this._set_handlers();
        },
        
        _set_orar: function() {
            if(! this.element.val()) return;
            var orar = [];
            var lines = this.element.val().trim().split(/\n/);
            if(/,/.test(lines[0]))  // CSV (rezultat eventual, prin operaţia "Export")
                $.each(lines, function(i, el) {
                    orar.push(el.split(','));
                });
            else { // text preformatat: nume-profesor, apoi ore separate prin TAB
                var nume = /^\S+\s\S*\s\S*\s+/; // "Nume", sau "Nume Pren", sau "Nume Pren Pren" 
                $.each(lines, function(i, el) {
                    prof = el.match(nume)[0], n = prof.length;
                    orar.push([prof.trim()].concat(el.slice(n).split(/\s+/)));
                });
            }
            if(collision()) return;      //alert(JSON.stringify(orar, null, 2));
            this.spread = set_spread();  //alert(JSON.stringify(this.spread));
            return orar; // $('#grid-orar').next().html(JSON.stringify(orar, null, 2));
         
            function collision() {
                var err = []
                for(var j=1, m=orar[0].length; j < m; ++j)
                    for(var i=0, n=orar.length-1; i < n; ++i) 
                        for(var k=i+1, p=n+1; k < p; ++k) {
                            var ora = orar[i][j];
                            if(ora.length > 1 && ora == orar[k][j])
                                err.push(orar[i][0] + ' / ' + orar[k][0] + ': ' + ora + ', ora ' + j);
                        }
                if(err.length > 0) {
                    alert("Suprapuneri:\n\n" + err.join('\n'));
                    return true;
                }
            };
            
            function set_spread() {
                var spread = {};
                var m = orar[0].length;
                for(var i=0, n=orar.length; i < n; i++)
                    for(var j=1; j < m; j++) {
                        var q = orar[i][j];
                        if(q == '-' || q == '~') continue;
                        if(! spread[q])
                            spread[q] = [i];
                        else {
                            if(spread[q].indexOf(i) == -1)
                                spread[q].push(i);
                        }
                    }
                return spread;
            };
        },

        _init: function() {
            if(this.orar.length == 0) return;
            var scor = 0;
            var html = []; 
            $.each(this.orar, function(i, el) {
                scor += gaps(el);
                html.push('<tr><td>', el[0], '</td>');
                for(var i=1, n=el.length; i < n; ++i) {
                    if(el[i] != '-' && el[i] != '~')
                        html.push('<td class="collate">', el[i], '</td>');
                    else
                        html.push('<td>', el[i], '</td>');
                }
                html.push('</tr>');
            });
            this.hist = [];
           // this.element.prev().hide();
           // this.element.hide();
            $('#grid-orar table').html($(html.join('')));
            $('#tools-bar').find('span:first').text(scor)
                                              .next().text('');  // initial gaps
            var colla = $('#collate textarea');
            if(! colla.val())
                colla.val(this.element.val());
        },
        
        _set_handlers: function() {
            var bar = $('#tools-bar'),
                got = $('#grid-orar table');
            var Self = this;

            bar.find('button:first').on('click', function(event) {
                if(Self.element.is(':visible'))
                    Self.orar = Self._set_orar();
                Self._init();                
            });
            
            bar.find('button:contains(Mark)').on('click', function(event) {
                var clasa = $(this).prev().val(); 
                got.find('tr').toggle();
                got.find('td:contains(' + clasa + ')').toggleClass('highlight').parent().show();
                
            });

            function get_scor() {
                var grid = got[0], scor = 0;
                for(var i=0, rl=grid.rows.length; i < rl; i++) {
                    var line = [];
                    for(var j=0, cl=grid.rows[0].cells.length; j < cl; j++)
                        line.push(grid.rows[i].cells[j].innerHTML);
                    scor += gaps(line);
                }
                return scor;
            };
            
            got.on('click', function(event) {
                var target = $(event.target);
                if(target.is('td')) {
                    if(target.index() > 0) {
                        var ql = target.text();
                        if(ql == '-' || ql == '~')
                            target.addClass('gap-source');
                        else
                            target.addClass('gap-dest');
                    }
                    else {
                        var rows = got.find('tr');
                        if(got.hasClass('spread')) {
                            rows.show();
                            got.removeClass('spread');
                        }
                        else {
                            var idx = target.parent().index(),
                                ore = Self.orar[idx],
                                profs = [];
                            for(var i=1, n=ore.length; i < n; i++) {
                                var q = ore[i];
                                if(q == '-' || q == '~') continue;
                                var sprq = Self.spread[q];
                                for(var j=0, m=sprq.length; j < m; j++)
                                    if(profs.indexOf(sprq[j]) == -1)
                                        profs.push(sprq[j]);
                            }
                            rows.hide();
                            $.each(profs, function(i, el) {
                                rows.eq(el).show();
                            });
                            got.addClass('spread');
                        }
                    }
                }
            });
            
            got.on('mouseenter', 'tr td:first-child', function() {
                $(this).parent().find('td.collate').addClass('compare1');
            });
            got.on('mouseleave', 'tr td:first-child', function() {
                $(this).parent().find('td.collate').removeClass('compare1');
            });
            
            bar.find('button:contains(swap)').on('click', function(event) {
                var td1 = got.find('td.gap-source');
                if(td1.length == 1) {
                    var td2 = td1.parent().find('td.gap-dest');
                    if(td2.length == 1) {
                        var id1 = td1.index(), 
                            id2 = td2.index();
                        if((id1 < 7 && id2 < 7) || (id1 > 6 && id2 > 6)) {
                            Self.hist.push([td1.parent().index(), id1, id2].join(', '));
                            var sig = id1 < 7 ? '-' : '~';
                            SWAP(td1, td2);
                            do { 
                                 td2 = td1.parent().siblings()
                                                   .find("td:contains("+td1.text()+")")
                                                   .filter(function() {
                                                        return $(this).index() == id1;});
                                 td1 = td2.parent().find("td")
                                                   .filter(function() {
                                                        return $(this).index() == id2;})
                                 if(!(td1.length && td2.length)) {
                                    alert('Atenţie: lipseşte o clasă pe coloană!\n(a folosi "undo")');
                                    break;
                                 }
                                 SWAP(td1, td2);
                                 td1 = td2;
                             } while(td1.text() != sig);
                         }
                         bar.find('span:last').text(get_scor());  // current gaps
                    }
                }
                got.find('td').removeClass('gap-source').removeClass('gap-dest');
            });
            
            bar.find('button:contains(undo)').on('click', function(event) {
                if(Self.hist.length > 0) {
                    var last = Self.hist.pop().split(',');
                    var tr = got.find('tr').eq(last[0])
                                .find('td').eq(last[2]).addClass('gap-source')
                                .end()
                                .eq(last[1]).addClass('gap-dest');
                    bar.find('button:contains(swap)').click();
                    Self.hist.pop();
                }
            });

            bar.find('a').on('click', function(event){
                var grid = got[0];
                var gridS = '';
                var cols = grid.rows[0].cells.length - 1;
                for(var i=0, rl=grid.rows.length; i < rl; i++) {
                    for(var j=0; j < cols; j++)
                        gridS += grid.rows[i].cells[j].innerHTML + ",";
                    gridS += grid.rows[i].cells[cols].innerHTML + "\r\n"; // "\n"
                }
                $(event.target).prop({
                    'href': 'data:application/csv;charset=utf-8,' + encodeURIComponent(gridS),
                    'target': '_blank',
                    'download': 'ret_orar.csv'
                });
               // alert(Self.hist.join('\n'));
            });
            
            $('#collate button').on('click', function(event) {
                var lines = $(this).prev().prev().val().trim().split(/\n/);
                var orar = [];
                $.each(lines, function(i, el) {
                    orar.push(el.split(','));
                });
                var m = orar[0].length, n = orar.length, i, j, scor = 0;
                for(i=0; i < n; i++) {
                    scor += gaps(orar[i]);
                    for(j=1; j < m; j++) {
                        var ora = orar[i][j];
                        orar[i][j] = (ora == '-' || ora == '~')? 0 : 1;
                    }
                }
                for(i=0; i < n; i++) {
                    var prof = got.find('td:contains(' + orar[i][0] + ')');
                    if(prof) {
                        var gtr = prof.parent().find('td');
                        for(j=1; j < m; j++)
                            if(orar[i][j])
                                gtr.eq(j).addClass('compare');
                    }
                }
                $(this).parent().find('span:last').text(scor + ' ferestre');
            });
            
            $('#coll_cancel').on('click', function(event) {
                event.preventDefault();
                got.find('td').removeClass('compare');
            });
        }
    });
})(jQuery);
