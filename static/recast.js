(function($) {
    function BAR() {
        let bar = [
            '<div id="grid-orar" style="float:left">',
                '<table border="1" cellspacing="2" cellpadding="1"></table>',
            '</div>',

            '<div id="tools-bar" style="float:left;padding-left:2em;margin-top:20px">',
                '<p style="padding-right:1em"><button title="(re)încarcă distribuţia INIŢIALĂ a orelor">Load</button></p>',
                '<p><input value="9A"><button title="Reduce la profesorii clasei / Extinde tabelul redus">Mark</button></p>',
                '<p><button title="Mută clasa (marcată) în ziua marcată (posibilă)">SWAP</button></p>',
                '<p><button title="verifică numărul de ore/zi la clase">Verify</button></p>',
                '<p><button title="anulează operaţii SWAP, începând cu ultima">Undo</button></p>',
                '<p><a title="salvează distribuţia curentă">Export</a></p>',
            '</div>',
        ];
        return $(bar.join(''));
    };

    function SWAP(dcls, td2) { 
        td2.append(dcls);
        dcls.parent().children().find(dcls).remove();
    };
   
    $.widget("vb.recast", {
        _create: function() { 
            BAR().insertAfter(this.element);
            $('#tools-bar').find('p:gt(0)').hide();
            this.orar = [];
            this.spread = {};
            this.spreadz = {};
            this._set_handlers();
        },
        
        _set_orar: function() {
            if(! this.element.val()) return;
            var orar = [];
            var lines = this.element.val().trim().split(/\n/);
            $.each(lines, function(i, el) {
                orar.push(el.split(','));
            });
            this.spread = set_spread();  // alert(JSON.stringify(this.spread, null, 2));
            this.spreadz = set_spreadz();  // alert(JSON.stringify(this.spreadz, null, 2));
            return orar; // $('#grid-orar').next().html(JSON.stringify(orar, null, 2));

            function set_spread() {  // clasă => [idx_prof. cu ore la acea clasă]
                let spread = {};
                for(let i=1, n=orar.length; i < n; i++)
                    for(let j=1; j < 6; j++) {
                        let qls = orar[i][j].split(' ');
                        for(let q of qls) {
                            if(! spread[q])
                                spread[q] = [i];
                            else {
                                if(spread[q].indexOf(i) == -1)
                                    spread[q].push(i);
                            }
                        }
                    }
                return spread;
            };

            function set_spreadz() {  // clasă => [ore-pe-zi]
                let spreadz = {};
                for(let i=1, n=orar.length; i < n; i++)
                    for(let j=1; j < 6; j++) {
                        let qls = orar[i][j].split(' ');
                        for(let q of qls) {
                            if(! spreadz[q])
                                spreadz[q] = [0,0,0,0,0];
                            spreadz[q][j-1] ++;
                        }
                    }
                return spreadz;
            };

        },

        _init: function() {
            if(this.orar.length == 0) return;
            let html = [];
            $.each(this.orar, function(i, el) { 
                if(i > 0) {
                    html.push('<tr><td style="background:#F4F6F6;cursor:pointer">', el[0], '</td>');
                    for(var i=1, n=el.length; i < n; ++i) {
                            html.push('<td>');
                            for(let e of el[i].split(' ')) {
                                if(e != "")
                                    html.push('<div class="aligncls">', e, '</div>');
                            }
                            html.push('</td>');
                    }
                    html.push('</tr>');
                } else {
                        html.push('<tr>');
                        for(let e of el) {
                            if(e == "prof")
                                html.push('<th style="background:#F4F6F6;color:blue" title="recuperează tabelul, după diverse acţiuni">', e, '</th>');
                            else
                                html.push('<th style="background:#F4F6F6">', e, '</th>');
                        }
                        html.push('</tr>');
                }
            });
            this.hist = [];
            this.element.prev().hide();
            this.element.hide();
            $('#grid-orar table').html($(html.join('')));
          //  $('#grid-orar table tr th:first-child').css('cursor', 'pointer');
        },
        
        _set_handlers: function() {
            var bar = $('#tools-bar'),
                got = $('#grid-orar table');
            var Self = this;

            bar.find('button:first').on('click', function(event) {
                if(Self.element.is(':visible')) {
                    Self.orar = Self._set_orar();
                    $('#tools-bar').find('p:gt(0)').show();
                }
                Self._init();                
            });
            
            bar.find('button:contains(Mark)').on('click', function(event) {
                let clasa = $(this).prev().val();
                got.find('tr:gt(0)').toggle();
                if(!clasa) {
                    got.find('div').removeClass('highl');
                    got.find('tr:gt(0)').show();
                } else {
                    got.find('div:contains(' + clasa +')').toggleClass('highl')
                       .parent().parent().show();
                    $(this).prev().val('');
                }
            });

            got.on('click', function(event) {
                var target = $(event.target);  
                if(target.is('div')) {
                    if(! got.find('div.gap-source').length) {
                        got.find('div:contains(' + target.text() +')').toggleClass('highl');
                        target.addClass('gap-source');
                    }
                } else {
                    if(target.is('td') && target.index() > 0) {
                        let gps = got.find('div.gap-source');
                        if(gps.length == 1) {
                            let gtd = gps.parent().parent(); 
                            if(gtd.has(target).length) {
                                if(! got.find('td.gap-dest').length) {
                                    let qls = gps.text();
                                    if(Self.spreadz[qls][target.index()-1])
                                        target.addClass('gap-dest');
                                    else {
                                        alert(qls + " NU are oră în ziua " + target.index() + "\n\nClick în altă zi (şi SWAP)\nsau\nClick 'prof' pentru a reconstitui starea anterioară");
                                    }
                                }
                            }
                        }
                    } else {
                        if(target.index() == 0) {
                            let rows = got.find('tr');
                            if(target.is('th')) {
                                if(got.hasClass('spread')) {
                                    rows.show();
                                    got.removeClass('spread');
                                }
                                got.find('div').removeClass('gap-source').removeClass('highl');
                            } else {
                                let idx = target.parent().index(),
                                    ore = Self.orar[idx],
                                    profs = [];
                                for(let i=1, n=ore.length; i < n; i++) {
                                    if(ore[i]) {
                                        let qls = ore[i].split(' ');
                                        for(let q of qls) {
                                            let sprq = Self.spread[q];
                                            for(let j=0, m=sprq.length; j < m; j++)
                                                if(profs.indexOf(sprq[j]) == -1)
                                                    profs.push(sprq[j]);
                                        }
                                    }
                                }
                                rows.hide(); rows.eq(0).show();
                                $.each(profs, function(i, el) {
                                    rows.eq(el).show();
                                });
                                got.addClass('spread');
                           }
                        }
                    }
                }
            });

            bar.find('button:contains(SWAP)').on('click', function(event) {
                let dCls = got.find('div.gap-source');
                if(dCls.length == 1) {
                    let td1 = dCls.parent(),
                        td2 = td1.parent().find('td.gap-dest');
                    if(td2.length == 1) {
                        let id1 = td1.index(), 
                            id2 = td2.index();
                        Self.hist.push([td1.parent().index(), id1, id2].join(', '));
                        SWAP(dCls, td2);
                    }
                }
                got.find('td, div').removeClass('gap-source')
                                   .removeClass('gap-dest')
                                   .removeClass('highl');
            });

            bar.find('button:contains(Undo)').on('click', function(event) {
                if(Self.hist.length > 0) {
                    let last = Self.hist.pop().split(',');
                    let tr = got.find('tr').eq(last[0])
                    tr.find('td').eq(last[2])
                                 .find('div:last-child').addClass('gap-source');
                    tr.find('td').eq(last[1]).addClass('gap-dest');
                    bar.find('button:contains(SWAP)').click();
                    Self.hist.pop();
                }
            });

            bar.find('button:contains(Verify)').on('click', function(event) {
                let sprz = {};
                got.find('tr:gt(0)').each(function() {
                    $(this).children().each(function(i, el) {  //console.log($(el).text());
                        if(i > 0) {
                            qls = $(el).text().match(/\d*[A-Z]/g); 
                            if(qls) {
                                for(let q of qls) { 
                                    if(! sprz[q])
                                        sprz[q] = [0,0,0,0,0];
                                    sprz[q][i-1] ++; 
                                }
                            }
                        }
                    });
                });     // alert(JSON.stringify(sprz));
                dver = ["Diferenţe nr. ore/zi la clase\n\ncls:  INIŢIAL / ACUM\n\n"];
                for(q in sprz) {
                    let s2 = sprz[q],
                        s1 = Self.spreadz[q];
                    for(let i=0; i < 6; i++) {
                        if(s2[i] != s1[i]) 
                            dver.push(q, ': ', s1, ' / ', s2, '\n');
                        break;
                    }
                }
                alert(dver.join(''));
            });
            
            bar.find('a').on('click', function(event){
                let gridS = [];
                got.find('tr:gt(0)').each(function() {
                    let grd = [];
                    $(this).children().each(function(i, el) {  //console.log($(el).text());
                        let qls = $(el).text();
                        if(i > 0) {
                            qls = qls.match(/\d*[A-Z]/g);
                            if(qls) qls = qls.join(" ");
                        }
                        grd.push(qls);
                    });
                    gridS.push(grd.join(','), '\n');
                });  // alert(gridS);
                $(event.target).prop({
                    'href': 'data:application/csv;charset=utf-8,' + 
                            encodeURIComponent(gridS.join("")),
                    'target': '_blank',
                    'download': 're_distr.csv'
                });
                //alert(Self.hist.join('\n'));
            });
            
        }
    });
})(jQuery);
