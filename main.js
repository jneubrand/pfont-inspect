const list = document.body.querySelector('#main')
const dropEl = document.body.querySelector('#dropzone')

function hexify(a) {
    out = []
    for (let n of a) {
        out.push((n.toString(16).length == 1 ? '0' : '') + n.toString(16))
    }
    return out.join(' ')
}

function hexify4(a) {
    return (Array(5-a.toString(16).length).join('0') + a.toString(16))
}

function binify(a) {
    out = []
    for (let n of a) {
        out.push(Array(9-n.toString(2).length).join('0') + n.toString(2))
    }
    return out.join(' ')
}

function textify(a) {
    out = []
    for (let n of a) {
        out.push((n > 32 && n < 127 ? String.fromCharCode(n) : '.'))
    }
    return out.join('')
}

function uintify(a) {
    out = 0
    let exp = 0;
    for (let n of a) {
        out += n * (1 << (exp * 8))
        exp += 1
    }
    return out
}

function bitifybyte(a) {
    // return [a >> 7,
    //        (a >> 6) & 1,
    //        (a >> 5) & 1,
    //        (a >> 4) & 1,
    //        (a >> 3) & 1,
    //        (a >> 2) & 1,
    //         a & 1]
    return [a & 1,
           (a >> 1) & 1,
           (a >> 2) & 1,
           (a >> 3) & 1,
           (a >> 4) & 1,
           (a >> 5) & 1,
           (a >> 6) & 1,
            a >> 7]
}

function initialize(data) {
    window.data = data
    window.offset = 0
    window.supported_codepoints = []
}

function outputSection(el, lg, id) {
    let it = document.createElement('hr')
    it.classList.toggle('huge', lg)
    if (id)
        it.id = id
    el.appendChild(it)
}

function outputItem(el, fmts, byteAmt, text) {
    let li = document.createElement('li'),
        content = document.createElement('span'),
        item = data.slice(0, byteAmt)
    li.innerHTML = '<code class="offset">' + hexify4(offset) + '</code>'
    content.classList.add('content')
    li.appendChild(content)
    if (fmts.indexOf('hex') >= 0)
        content.innerHTML +=
            '<code><grayed>0x</grayed>' +
                hexify(item) +
            '</code>'
    if (fmts.indexOf('dec') >= 0)
        content.innerHTML +=
            '<code>' +
                uintify(item) +
            '</code>'
    if (fmts.indexOf('bin') >= 0)
        content.innerHTML +=
            '<code><grayed>0b</grayed>' +
                binify(item) +
            '</code>'
    if (fmts.indexOf('direct') >= 0) {
        supported_codepoints.push(String.fromCodePoint(uintify(item)))
        content.innerHTML +=
            '<code class="utf">' +
                String.fromCodePoint(uintify(item)) +
            '</code>'
    }
    li.innerHTML += text
    el.appendChild(li)
    offset += byteAmt
    data = data.slice(byteAmt)
    return uintify(item)
}

function readItem(byteAmt) {
    let item = data.slice(0, byteAmt)
    offset += byteAmt
    data = data.slice(byteAmt)
    return uintify(item)
}

function loadHashTable(el, size) {
    outputSection(el, true, 'hash')
    let data = []
    for (let i = 0; i < size; i++) {
        if (i)
            outputSection(el, false)
      let hash_value =
        outputItem(el, ['hex'], 1, 'Value', 'Hash Value.')
      let offset_table_size =
        outputItem(el, ['hex'], 1, 'Offset-Table-Size', 'Offset Table Size.')
      let offset_table_offset =
        outputItem(el, ['hex', 'dec'], 2, 'Offset-Table-Offset', 'Offset location.')
        data.push({'hash':   hash_value,
                   'size':   offset_table_size,
                   'offset': offset_table_offset})
    }
    return data
}

function loadOffsetTables(el, offset_table_info, codepoint_bytes, features) {
    offset_table_info.sort((a, b) => a.offset - b.offset)
    let offset_table_offset = offset
    outputSection(el, true, 'offset')
    let first = true
    let out = []
    for (let i of offset_table_info) {
        if (!first)
            outputSection(el, false)
        else first = false
        el.appendChild(document.createTextNode(JSON.stringify(i)))
        el.appendChild(document.createElement('br'))
        el.appendChild(document.createTextNode(
            '∆=' + (offset-offset_table_offset - i['offset'])))
        // console.log(i)
        while ((offset-offset_table_offset - i['offset']) < 0) {
            outputItem(el, ['hex'], 1, 'Unused!?', 'Discarded while getting to correct offset.')
        }
        for (let j = 0; j < i['size']; j++) {
          let codepoint =
            outputItem(el, ['hex', 'dec', 'direct'], codepoint_bytes, 'Codepoint', 'Unicode char.')
          let charOffset =
            outputItem(el, ['hex'], features & 1 ? 2 : 4, 'Offset', 'Data offset location.')
            out.push({'codepoint': codepoint, 'offset': charOffset})
        }
    }
    return out
}

function loadGlyphTable(el, glyph_table_info, codepoint_bytes, features) {
    glyph_table_info.sort((a, b) => a.offset - b.offset)
    console.log(glyph_table_info)
    let glyph_table_offset = offset

    outputSection(el, true, 'glyph')
    let first = true
    for (let i of glyph_table_info) {
        if (!first)
            outputSection(el, false)
        else first = false
        el.appendChild(document.createTextNode(JSON.stringify(i)))
        let code = document.createElement('code')
        code.innerText = String.fromCodePoint(i.codepoint)
        el.appendChild(code)
        console.log(offset, glyph_table_offset, i['offset'])
        while ((offset-glyph_table_offset - i['offset']) < 0) {
            outputItem(el, ['hex'], 4, 'Unused!?', 'Discarded while getting to correct offset.')
        }
      let bitmapWidth =
        outputItem(el, ['dec'], 1, 'Bmp-Width')
      let bitmapHeight =
        outputItem(el, ['dec'], 1, 'Bmp-Height')
      let offsetLeft =
        outputItem(el, ['dec'], 1, 'Offset-Left')
      let offsetTop =
        outputItem(el, ['dec'], 1, 'Offset-Top')
      let horizontalAdvance =
        outputItem(el, ['dec'], 1, 'Horiz-Advance')
        // outputItem(el, ['hex'], 3, '')
        if (features & 2) { // use rle4

        } else { // actual bitmap
            let i = 0
            buffer = []
            while (i < Math.ceil(bitmapHeight * bitmapWidth / 8 / 4) * 4) {
                buffer = buffer.concat(bitifybyte(
                    readItem(1)
                ))
                i += 1
            }
            let code = ''
            for (let i = 0; i < bitmapHeight; i++) {
                code += '<tr>'
                for (let j = 0; j < bitmapWidth; j++) {
                    code += '<td class="' +
                            (buffer.shift() ? 'l' : 'd') + '">'
                    code += '</td>'
                }
                code += '</tr>'
            }
            let li = document.createElement('table')
            li.innerHTML = code
            el.appendChild(li)
        }
    }
    console.log(glyph_table_info)
    window.a = glyph_table_info
}

function loadFile(f, el) {
    el.innerHTML = ''
    initialF = new Uint8Array(f);
    console.log(initialF.length);
    f = new Uint8Array(f);
    initialize(f)

  let version =
    outputItem(el, ['hex'], 1, 'Version', 'Font version.')
    outputItem(el, ['dec'], 1, 'Max-Height', 'Line height.')
  let glyph_amount =
    outputItem(el, ['dec'], 2, 'Glyph-Amt', 'The total amount of glyphs encoded.')
    outputItem(el, ['hex'], 2, 'Wildcard-Codepoint', 'The codepoint to use when a character isn\'t found.')
  let hash_table_size =
    outputItem(el, ['hex'], 1, 'Hash-Table-Size', 'Total size of the hash table.')
  let codepoint_bytes =
    outputItem(el, ['hex'], 1, 'Codepoint-Bytes', 'Size of a codepoint in the offset_table')
    let features = 0 // default u32 offsets in v2/v1
    if (version >= 3) {
        outputItem(el, ['hex'], 1, 'Size')
      features =
        outputItem(el, ['bin'], 1, 'Features [0b1 | 0: u32; 1: u16 /// 0b10 | bitmapped; 1: rle4]')
    }
    if (glyph_amount > 1000) {
        return
    }
  let offset_table_info =
    loadHashTable(el, hash_table_size)
  let glyph_table_info =
    loadOffsetTables(el, offset_table_info, codepoint_bytes, features)
    loadGlyphTable(el, glyph_table_info, features)

    let li = document.createElement('li')
  let metrics_info =
    outputSection(el, true, 'chars')
    li.innerHTML = "Chars: " + supported_codepoints
                                   .sort()
                                   .map(a => '<code>' + a + '</code>')
                                   .join(', ')
    el.appendChild(li)

    setTimeout(() => window.scrollTo(0, document.querySelector('#chars').offsetTop - 100), 100)
}

dropEl.addEventListener('dragenter', e => {
    //
})
dropEl.addEventListener('dragover', e => {
    e.stopPropagation()
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
})
dropEl.addEventListener('drop', e => {
    e.stopPropagation()
    e.preventDefault()
    if (e.dataTransfer.files.length == 1) {
        console.log('FILES')
        let reader = new FileReader(),
            name = e.dataTransfer.files[0].name
        reader.readAsArrayBuffer(e.dataTransfer.files[0])
        reader.addEventListener('load',
            () => {console.log(btoa(reader.result)); loadFile(reader.result, list)})
    }
})

// If you'd like to autoload a font (useful when debugging this tool), the
// below code may be helpful.
//
// let initData = "... put your b64 here ..."
//
// var bin = atob(initData);
// var bytes = new Uint8Array(bin.length);
// for (var i = 0; i < bin.length; i++) {
//     bytes[i] = bin.charCodeAt(i);
// }
//
// loadFile(bytes.buffer, list)
