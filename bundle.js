/** Types of elements found in htmlparser2's DOM */
var ElementType;
(function (ElementType) {
    /** Type for the root element of a document */
    ElementType["Root"] = "root";
    /** Type for Text */
    ElementType["Text"] = "text";
    /** Type for <? ... ?> */
    ElementType["Directive"] = "directive";
    /** Type for <!-- ... --> */
    ElementType["Comment"] = "comment";
    /** Type for <script> tags */
    ElementType["Script"] = "script";
    /** Type for <style> tags */
    ElementType["Style"] = "style";
    /** Type for Any tag */
    ElementType["Tag"] = "tag";
    /** Type for <![CDATA[ ... ]]> */
    ElementType["CDATA"] = "cdata";
    /** Type for <!doctype ...> */
    ElementType["Doctype"] = "doctype";
})(ElementType || (ElementType = {}));
/**
 * Tests whether an element is a tag or not.
 *
 * @param elem Element to test
 */
function isTag$1(elem) {
    return (elem.type === ElementType.Tag ||
        elem.type === ElementType.Script ||
        elem.type === ElementType.Style);
}
// Exports for backwards compatibility
/** Type for the root element of a document */
const Root = ElementType.Root;
/** Type for Text */
const Text$1 = ElementType.Text;
/** Type for <? ... ?> */
const Directive = ElementType.Directive;
/** Type for <!-- ... --> */
const Comment$1 = ElementType.Comment;
/** Type for <script> tags */
const Script = ElementType.Script;
/** Type for <style> tags */
const Style = ElementType.Style;
/** Type for Any tag */
const Tag = ElementType.Tag;
/** Type for <![CDATA[ ... ]]> */
const CDATA$1 = ElementType.CDATA;
/** Type for <!doctype ...> */
const Doctype = ElementType.Doctype;

/**
 * This object will be used as the prototype for Nodes when creating a
 * DOM-Level-1-compliant structure.
 */
class Node {
    constructor() {
        /** Parent of the node */
        this.parent = null;
        /** Previous sibling */
        this.prev = null;
        /** Next sibling */
        this.next = null;
        /** The start index of the node. Requires `withStartIndices` on the handler to be `true. */
        this.startIndex = null;
        /** The end index of the node. Requires `withEndIndices` on the handler to be `true. */
        this.endIndex = null;
    }
    // Read-write aliases for properties
    /**
     * Same as {@link parent}.
     * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
     */
    get parentNode() {
        return this.parent;
    }
    set parentNode(parent) {
        this.parent = parent;
    }
    /**
     * Same as {@link prev}.
     * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
     */
    get previousSibling() {
        return this.prev;
    }
    set previousSibling(prev) {
        this.prev = prev;
    }
    /**
     * Same as {@link next}.
     * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
     */
    get nextSibling() {
        return this.next;
    }
    set nextSibling(next) {
        this.next = next;
    }
    /**
     * Clone this node, and optionally its children.
     *
     * @param recursive Clone child nodes as well.
     * @returns A clone of the node.
     */
    cloneNode(recursive = false) {
        return cloneNode(this, recursive);
    }
}
/**
 * A node that contains some data.
 */
class DataNode extends Node {
    /**
     * @param data The content of the data node
     */
    constructor(data) {
        super();
        this.data = data;
    }
    /**
     * Same as {@link data}.
     * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
     */
    get nodeValue() {
        return this.data;
    }
    set nodeValue(data) {
        this.data = data;
    }
}
/**
 * Text within the document.
 */
class Text extends DataNode {
    constructor() {
        super(...arguments);
        this.type = ElementType.Text;
    }
    get nodeType() {
        return 3;
    }
}
/**
 * Comments within the document.
 */
class Comment extends DataNode {
    constructor() {
        super(...arguments);
        this.type = ElementType.Comment;
    }
    get nodeType() {
        return 8;
    }
}
/**
 * Processing instructions, including doc types.
 */
class ProcessingInstruction extends DataNode {
    constructor(name, data) {
        super(data);
        this.name = name;
        this.type = ElementType.Directive;
    }
    get nodeType() {
        return 1;
    }
}
/**
 * A `Node` that can have children.
 */
class NodeWithChildren extends Node {
    /**
     * @param children Children of the node. Only certain node types can have children.
     */
    constructor(children) {
        super();
        this.children = children;
    }
    // Aliases
    /** First child of the node. */
    get firstChild() {
        var _a;
        return (_a = this.children[0]) !== null && _a !== void 0 ? _a : null;
    }
    /** Last child of the node. */
    get lastChild() {
        return this.children.length > 0
            ? this.children[this.children.length - 1]
            : null;
    }
    /**
     * Same as {@link children}.
     * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
     */
    get childNodes() {
        return this.children;
    }
    set childNodes(children) {
        this.children = children;
    }
}
class CDATA extends NodeWithChildren {
    constructor() {
        super(...arguments);
        this.type = ElementType.CDATA;
    }
    get nodeType() {
        return 4;
    }
}
/**
 * The root node of the document.
 */
class Document extends NodeWithChildren {
    constructor() {
        super(...arguments);
        this.type = ElementType.Root;
    }
    get nodeType() {
        return 9;
    }
}
/**
 * An element within the DOM.
 */
class Element extends NodeWithChildren {
    /**
     * @param name Name of the tag, eg. `div`, `span`.
     * @param attribs Object mapping attribute names to attribute values.
     * @param children Children of the node.
     */
    constructor(name, attribs, children = [], type = name === "script"
        ? ElementType.Script
        : name === "style"
            ? ElementType.Style
            : ElementType.Tag) {
        super(children);
        this.name = name;
        this.attribs = attribs;
        this.type = type;
    }
    get nodeType() {
        return 1;
    }
    // DOM Level 1 aliases
    /**
     * Same as {@link name}.
     * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
     */
    get tagName() {
        return this.name;
    }
    set tagName(name) {
        this.name = name;
    }
    get attributes() {
        return Object.keys(this.attribs).map((name) => {
            var _a, _b;
            return ({
                name,
                value: this.attribs[name],
                namespace: (_a = this["x-attribsNamespace"]) === null || _a === void 0 ? void 0 : _a[name],
                prefix: (_b = this["x-attribsPrefix"]) === null || _b === void 0 ? void 0 : _b[name],
            });
        });
    }
}
/**
 * @param node Node to check.
 * @returns `true` if the node is a `Element`, `false` otherwise.
 */
function isTag(node) {
    return isTag$1(node);
}
/**
 * @param node Node to check.
 * @returns `true` if the node has the type `CDATA`, `false` otherwise.
 */
function isCDATA(node) {
    return node.type === ElementType.CDATA;
}
/**
 * @param node Node to check.
 * @returns `true` if the node has the type `Text`, `false` otherwise.
 */
function isText(node) {
    return node.type === ElementType.Text;
}
/**
 * @param node Node to check.
 * @returns `true` if the node has the type `Comment`, `false` otherwise.
 */
function isComment(node) {
    return node.type === ElementType.Comment;
}
/**
 * @param node Node to check.
 * @returns `true` if the node has the type `ProcessingInstruction`, `false` otherwise.
 */
function isDirective(node) {
    return node.type === ElementType.Directive;
}
/**
 * @param node Node to check.
 * @returns `true` if the node has the type `ProcessingInstruction`, `false` otherwise.
 */
function isDocument(node) {
    return node.type === ElementType.Root;
}
/**
 * @param node Node to check.
 * @returns `true` if the node has children, `false` otherwise.
 */
function hasChildren(node) {
    return Object.prototype.hasOwnProperty.call(node, "children");
}
/**
 * Clone a node, and optionally its children.
 *
 * @param recursive Clone child nodes as well.
 * @returns A clone of the node.
 */
function cloneNode(node, recursive = false) {
    let result;
    if (isText(node)) {
        result = new Text(node.data);
    }
    else if (isComment(node)) {
        result = new Comment(node.data);
    }
    else if (isTag(node)) {
        const children = recursive ? cloneChildren(node.children) : [];
        const clone = new Element(node.name, { ...node.attribs }, children);
        children.forEach((child) => (child.parent = clone));
        if (node.namespace != null) {
            clone.namespace = node.namespace;
        }
        if (node["x-attribsNamespace"]) {
            clone["x-attribsNamespace"] = { ...node["x-attribsNamespace"] };
        }
        if (node["x-attribsPrefix"]) {
            clone["x-attribsPrefix"] = { ...node["x-attribsPrefix"] };
        }
        result = clone;
    }
    else if (isCDATA(node)) {
        const children = recursive ? cloneChildren(node.children) : [];
        const clone = new CDATA(children);
        children.forEach((child) => (child.parent = clone));
        result = clone;
    }
    else if (isDocument(node)) {
        const children = recursive ? cloneChildren(node.children) : [];
        const clone = new Document(children);
        children.forEach((child) => (child.parent = clone));
        if (node["x-mode"]) {
            clone["x-mode"] = node["x-mode"];
        }
        result = clone;
    }
    else if (isDirective(node)) {
        const instruction = new ProcessingInstruction(node.name, node.data);
        if (node["x-name"] != null) {
            instruction["x-name"] = node["x-name"];
            instruction["x-publicId"] = node["x-publicId"];
            instruction["x-systemId"] = node["x-systemId"];
        }
        result = instruction;
    }
    else {
        throw new Error(`Not implemented yet: ${node.type}`);
    }
    result.startIndex = node.startIndex;
    result.endIndex = node.endIndex;
    if (node.sourceCodeLocation != null) {
        result.sourceCodeLocation = node.sourceCodeLocation;
    }
    return result;
}
function cloneChildren(childs) {
    const children = childs.map((child) => cloneNode(child, true));
    for (let i = 1; i < children.length; i++) {
        children[i].prev = children[i - 1];
        children[i - 1].next = children[i];
    }
    return children;
}

// Default options
const defaultOpts$2 = {
    withStartIndices: false,
    withEndIndices: false,
    xmlMode: false,
};
class DomHandler {
    /**
     * @param callback Called once parsing has completed.
     * @param options Settings for the handler.
     * @param elementCB Callback whenever a tag is closed.
     */
    constructor(callback, options, elementCB) {
        /** The elements of the DOM */
        this.dom = [];
        /** The root element for the DOM */
        this.root = new Document(this.dom);
        /** Indicated whether parsing has been completed. */
        this.done = false;
        /** Stack of open tags. */
        this.tagStack = [this.root];
        /** A data node that is still being written to. */
        this.lastNode = null;
        /** Reference to the parser instance. Used for location information. */
        this.parser = null;
        // Make it possible to skip arguments, for backwards-compatibility
        if (typeof options === "function") {
            elementCB = options;
            options = defaultOpts$2;
        }
        if (typeof callback === "object") {
            options = callback;
            callback = undefined;
        }
        this.callback = callback !== null && callback !== void 0 ? callback : null;
        this.options = options !== null && options !== void 0 ? options : defaultOpts$2;
        this.elementCB = elementCB !== null && elementCB !== void 0 ? elementCB : null;
    }
    onparserinit(parser) {
        this.parser = parser;
    }
    // Resets the handler back to starting state
    onreset() {
        this.dom = [];
        this.root = new Document(this.dom);
        this.done = false;
        this.tagStack = [this.root];
        this.lastNode = null;
        this.parser = null;
    }
    // Signals the handler that parsing is done
    onend() {
        if (this.done)
            return;
        this.done = true;
        this.parser = null;
        this.handleCallback(null);
    }
    onerror(error) {
        this.handleCallback(error);
    }
    onclosetag() {
        this.lastNode = null;
        const elem = this.tagStack.pop();
        if (this.options.withEndIndices) {
            elem.endIndex = this.parser.endIndex;
        }
        if (this.elementCB)
            this.elementCB(elem);
    }
    onopentag(name, attribs) {
        const type = this.options.xmlMode ? ElementType.Tag : undefined;
        const element = new Element(name, attribs, undefined, type);
        this.addNode(element);
        this.tagStack.push(element);
    }
    ontext(data) {
        const { lastNode } = this;
        if (lastNode && lastNode.type === ElementType.Text) {
            lastNode.data += data;
            if (this.options.withEndIndices) {
                lastNode.endIndex = this.parser.endIndex;
            }
        }
        else {
            const node = new Text(data);
            this.addNode(node);
            this.lastNode = node;
        }
    }
    oncomment(data) {
        if (this.lastNode && this.lastNode.type === ElementType.Comment) {
            this.lastNode.data += data;
            return;
        }
        const node = new Comment(data);
        this.addNode(node);
        this.lastNode = node;
    }
    oncommentend() {
        this.lastNode = null;
    }
    oncdatastart() {
        const text = new Text("");
        const node = new CDATA([text]);
        this.addNode(node);
        text.parent = node;
        this.lastNode = text;
    }
    oncdataend() {
        this.lastNode = null;
    }
    onprocessinginstruction(name, data) {
        const node = new ProcessingInstruction(name, data);
        this.addNode(node);
    }
    handleCallback(error) {
        if (typeof this.callback === "function") {
            this.callback(error, this.dom);
        }
        else if (error) {
            throw error;
        }
    }
    addNode(node) {
        const parent = this.tagStack[this.tagStack.length - 1];
        const previousSibling = parent.children[parent.children.length - 1];
        if (this.options.withStartIndices) {
            node.startIndex = this.parser.startIndex;
        }
        if (this.options.withEndIndices) {
            node.endIndex = this.parser.endIndex;
        }
        parent.children.push(node);
        if (previousSibling) {
            node.prev = previousSibling;
            previousSibling.next = node;
        }
        node.parent = parent;
        this.lastNode = null;
    }
}

// Generated using scripts/write-decode-map.ts
var htmlDecodeTree$2 = new Uint16Array(
// prettier-ignore
"\u1d41<\xd5\u0131\u028a\u049d\u057b\u05d0\u0675\u06de\u07a2\u07d6\u080f\u0a4a\u0a91\u0da1\u0e6d\u0f09\u0f26\u10ca\u1228\u12e1\u1415\u149d\u14c3\u14df\u1525\0\0\0\0\0\0\u156b\u16cd\u198d\u1c12\u1ddd\u1f7e\u2060\u21b0\u228d\u23c0\u23fb\u2442\u2824\u2912\u2d08\u2e48\u2fce\u3016\u32ba\u3639\u37ac\u38fe\u3a28\u3a71\u3ae0\u3b2e\u0800EMabcfglmnoprstu\\bfms\x7f\x84\x8b\x90\x95\x98\xa6\xb3\xb9\xc8\xcflig\u803b\xc6\u40c6P\u803b&\u4026cute\u803b\xc1\u40c1reve;\u4102\u0100iyx}rc\u803b\xc2\u40c2;\u4410r;\uc000\ud835\udd04rave\u803b\xc0\u40c0pha;\u4391acr;\u4100d;\u6a53\u0100gp\x9d\xa1on;\u4104f;\uc000\ud835\udd38plyFunction;\u6061ing\u803b\xc5\u40c5\u0100cs\xbe\xc3r;\uc000\ud835\udc9cign;\u6254ilde\u803b\xc3\u40c3ml\u803b\xc4\u40c4\u0400aceforsu\xe5\xfb\xfe\u0117\u011c\u0122\u0127\u012a\u0100cr\xea\xf2kslash;\u6216\u0176\xf6\xf8;\u6ae7ed;\u6306y;\u4411\u0180crt\u0105\u010b\u0114ause;\u6235noullis;\u612ca;\u4392r;\uc000\ud835\udd05pf;\uc000\ud835\udd39eve;\u42d8c\xf2\u0113mpeq;\u624e\u0700HOacdefhilorsu\u014d\u0151\u0156\u0180\u019e\u01a2\u01b5\u01b7\u01ba\u01dc\u0215\u0273\u0278\u027ecy;\u4427PY\u803b\xa9\u40a9\u0180cpy\u015d\u0162\u017aute;\u4106\u0100;i\u0167\u0168\u62d2talDifferentialD;\u6145leys;\u612d\u0200aeio\u0189\u018e\u0194\u0198ron;\u410cdil\u803b\xc7\u40c7rc;\u4108nint;\u6230ot;\u410a\u0100dn\u01a7\u01adilla;\u40b8terDot;\u40b7\xf2\u017fi;\u43a7rcle\u0200DMPT\u01c7\u01cb\u01d1\u01d6ot;\u6299inus;\u6296lus;\u6295imes;\u6297o\u0100cs\u01e2\u01f8kwiseContourIntegral;\u6232eCurly\u0100DQ\u0203\u020foubleQuote;\u601duote;\u6019\u0200lnpu\u021e\u0228\u0247\u0255on\u0100;e\u0225\u0226\u6237;\u6a74\u0180git\u022f\u0236\u023aruent;\u6261nt;\u622fourIntegral;\u622e\u0100fr\u024c\u024e;\u6102oduct;\u6210nterClockwiseContourIntegral;\u6233oss;\u6a2fcr;\uc000\ud835\udc9ep\u0100;C\u0284\u0285\u62d3ap;\u624d\u0580DJSZacefios\u02a0\u02ac\u02b0\u02b4\u02b8\u02cb\u02d7\u02e1\u02e6\u0333\u048d\u0100;o\u0179\u02a5trahd;\u6911cy;\u4402cy;\u4405cy;\u440f\u0180grs\u02bf\u02c4\u02c7ger;\u6021r;\u61a1hv;\u6ae4\u0100ay\u02d0\u02d5ron;\u410e;\u4414l\u0100;t\u02dd\u02de\u6207a;\u4394r;\uc000\ud835\udd07\u0100af\u02eb\u0327\u0100cm\u02f0\u0322ritical\u0200ADGT\u0300\u0306\u0316\u031ccute;\u40b4o\u0174\u030b\u030d;\u42d9bleAcute;\u42ddrave;\u4060ilde;\u42dcond;\u62c4ferentialD;\u6146\u0470\u033d\0\0\0\u0342\u0354\0\u0405f;\uc000\ud835\udd3b\u0180;DE\u0348\u0349\u034d\u40a8ot;\u60dcqual;\u6250ble\u0300CDLRUV\u0363\u0372\u0382\u03cf\u03e2\u03f8ontourIntegra\xec\u0239o\u0274\u0379\0\0\u037b\xbb\u0349nArrow;\u61d3\u0100eo\u0387\u03a4ft\u0180ART\u0390\u0396\u03a1rrow;\u61d0ightArrow;\u61d4e\xe5\u02cang\u0100LR\u03ab\u03c4eft\u0100AR\u03b3\u03b9rrow;\u67f8ightArrow;\u67faightArrow;\u67f9ight\u0100AT\u03d8\u03derrow;\u61d2ee;\u62a8p\u0241\u03e9\0\0\u03efrrow;\u61d1ownArrow;\u61d5erticalBar;\u6225n\u0300ABLRTa\u0412\u042a\u0430\u045e\u047f\u037crrow\u0180;BU\u041d\u041e\u0422\u6193ar;\u6913pArrow;\u61f5reve;\u4311eft\u02d2\u043a\0\u0446\0\u0450ightVector;\u6950eeVector;\u695eector\u0100;B\u0459\u045a\u61bdar;\u6956ight\u01d4\u0467\0\u0471eeVector;\u695fector\u0100;B\u047a\u047b\u61c1ar;\u6957ee\u0100;A\u0486\u0487\u62a4rrow;\u61a7\u0100ct\u0492\u0497r;\uc000\ud835\udc9frok;\u4110\u0800NTacdfglmopqstux\u04bd\u04c0\u04c4\u04cb\u04de\u04e2\u04e7\u04ee\u04f5\u0521\u052f\u0536\u0552\u055d\u0560\u0565G;\u414aH\u803b\xd0\u40d0cute\u803b\xc9\u40c9\u0180aiy\u04d2\u04d7\u04dcron;\u411arc\u803b\xca\u40ca;\u442dot;\u4116r;\uc000\ud835\udd08rave\u803b\xc8\u40c8ement;\u6208\u0100ap\u04fa\u04fecr;\u4112ty\u0253\u0506\0\0\u0512mallSquare;\u65fberySmallSquare;\u65ab\u0100gp\u0526\u052aon;\u4118f;\uc000\ud835\udd3csilon;\u4395u\u0100ai\u053c\u0549l\u0100;T\u0542\u0543\u6a75ilde;\u6242librium;\u61cc\u0100ci\u0557\u055ar;\u6130m;\u6a73a;\u4397ml\u803b\xcb\u40cb\u0100ip\u056a\u056fsts;\u6203onentialE;\u6147\u0280cfios\u0585\u0588\u058d\u05b2\u05ccy;\u4424r;\uc000\ud835\udd09lled\u0253\u0597\0\0\u05a3mallSquare;\u65fcerySmallSquare;\u65aa\u0370\u05ba\0\u05bf\0\0\u05c4f;\uc000\ud835\udd3dAll;\u6200riertrf;\u6131c\xf2\u05cb\u0600JTabcdfgorst\u05e8\u05ec\u05ef\u05fa\u0600\u0612\u0616\u061b\u061d\u0623\u066c\u0672cy;\u4403\u803b>\u403emma\u0100;d\u05f7\u05f8\u4393;\u43dcreve;\u411e\u0180eiy\u0607\u060c\u0610dil;\u4122rc;\u411c;\u4413ot;\u4120r;\uc000\ud835\udd0a;\u62d9pf;\uc000\ud835\udd3eeater\u0300EFGLST\u0635\u0644\u064e\u0656\u065b\u0666qual\u0100;L\u063e\u063f\u6265ess;\u62dbullEqual;\u6267reater;\u6aa2ess;\u6277lantEqual;\u6a7eilde;\u6273cr;\uc000\ud835\udca2;\u626b\u0400Aacfiosu\u0685\u068b\u0696\u069b\u069e\u06aa\u06be\u06caRDcy;\u442a\u0100ct\u0690\u0694ek;\u42c7;\u405eirc;\u4124r;\u610clbertSpace;\u610b\u01f0\u06af\0\u06b2f;\u610dizontalLine;\u6500\u0100ct\u06c3\u06c5\xf2\u06a9rok;\u4126mp\u0144\u06d0\u06d8ownHum\xf0\u012fqual;\u624f\u0700EJOacdfgmnostu\u06fa\u06fe\u0703\u0707\u070e\u071a\u071e\u0721\u0728\u0744\u0778\u078b\u078f\u0795cy;\u4415lig;\u4132cy;\u4401cute\u803b\xcd\u40cd\u0100iy\u0713\u0718rc\u803b\xce\u40ce;\u4418ot;\u4130r;\u6111rave\u803b\xcc\u40cc\u0180;ap\u0720\u072f\u073f\u0100cg\u0734\u0737r;\u412ainaryI;\u6148lie\xf3\u03dd\u01f4\u0749\0\u0762\u0100;e\u074d\u074e\u622c\u0100gr\u0753\u0758ral;\u622bsection;\u62c2isible\u0100CT\u076c\u0772omma;\u6063imes;\u6062\u0180gpt\u077f\u0783\u0788on;\u412ef;\uc000\ud835\udd40a;\u4399cr;\u6110ilde;\u4128\u01eb\u079a\0\u079ecy;\u4406l\u803b\xcf\u40cf\u0280cfosu\u07ac\u07b7\u07bc\u07c2\u07d0\u0100iy\u07b1\u07b5rc;\u4134;\u4419r;\uc000\ud835\udd0dpf;\uc000\ud835\udd41\u01e3\u07c7\0\u07ccr;\uc000\ud835\udca5rcy;\u4408kcy;\u4404\u0380HJacfos\u07e4\u07e8\u07ec\u07f1\u07fd\u0802\u0808cy;\u4425cy;\u440cppa;\u439a\u0100ey\u07f6\u07fbdil;\u4136;\u441ar;\uc000\ud835\udd0epf;\uc000\ud835\udd42cr;\uc000\ud835\udca6\u0580JTaceflmost\u0825\u0829\u082c\u0850\u0863\u09b3\u09b8\u09c7\u09cd\u0a37\u0a47cy;\u4409\u803b<\u403c\u0280cmnpr\u0837\u083c\u0841\u0844\u084dute;\u4139bda;\u439bg;\u67ealacetrf;\u6112r;\u619e\u0180aey\u0857\u085c\u0861ron;\u413ddil;\u413b;\u441b\u0100fs\u0868\u0970t\u0500ACDFRTUVar\u087e\u08a9\u08b1\u08e0\u08e6\u08fc\u092f\u095b\u0390\u096a\u0100nr\u0883\u088fgleBracket;\u67e8row\u0180;BR\u0899\u089a\u089e\u6190ar;\u61e4ightArrow;\u61c6eiling;\u6308o\u01f5\u08b7\0\u08c3bleBracket;\u67e6n\u01d4\u08c8\0\u08d2eeVector;\u6961ector\u0100;B\u08db\u08dc\u61c3ar;\u6959loor;\u630aight\u0100AV\u08ef\u08f5rrow;\u6194ector;\u694e\u0100er\u0901\u0917e\u0180;AV\u0909\u090a\u0910\u62a3rrow;\u61a4ector;\u695aiangle\u0180;BE\u0924\u0925\u0929\u62b2ar;\u69cfqual;\u62b4p\u0180DTV\u0937\u0942\u094cownVector;\u6951eeVector;\u6960ector\u0100;B\u0956\u0957\u61bfar;\u6958ector\u0100;B\u0965\u0966\u61bcar;\u6952ight\xe1\u039cs\u0300EFGLST\u097e\u098b\u0995\u099d\u09a2\u09adqualGreater;\u62daullEqual;\u6266reater;\u6276ess;\u6aa1lantEqual;\u6a7dilde;\u6272r;\uc000\ud835\udd0f\u0100;e\u09bd\u09be\u62d8ftarrow;\u61daidot;\u413f\u0180npw\u09d4\u0a16\u0a1bg\u0200LRlr\u09de\u09f7\u0a02\u0a10eft\u0100AR\u09e6\u09ecrrow;\u67f5ightArrow;\u67f7ightArrow;\u67f6eft\u0100ar\u03b3\u0a0aight\xe1\u03bfight\xe1\u03caf;\uc000\ud835\udd43er\u0100LR\u0a22\u0a2ceftArrow;\u6199ightArrow;\u6198\u0180cht\u0a3e\u0a40\u0a42\xf2\u084c;\u61b0rok;\u4141;\u626a\u0400acefiosu\u0a5a\u0a5d\u0a60\u0a77\u0a7c\u0a85\u0a8b\u0a8ep;\u6905y;\u441c\u0100dl\u0a65\u0a6fiumSpace;\u605flintrf;\u6133r;\uc000\ud835\udd10nusPlus;\u6213pf;\uc000\ud835\udd44c\xf2\u0a76;\u439c\u0480Jacefostu\u0aa3\u0aa7\u0aad\u0ac0\u0b14\u0b19\u0d91\u0d97\u0d9ecy;\u440acute;\u4143\u0180aey\u0ab4\u0ab9\u0aberon;\u4147dil;\u4145;\u441d\u0180gsw\u0ac7\u0af0\u0b0eative\u0180MTV\u0ad3\u0adf\u0ae8ediumSpace;\u600bhi\u0100cn\u0ae6\u0ad8\xeb\u0ad9eryThi\xee\u0ad9ted\u0100GL\u0af8\u0b06reaterGreate\xf2\u0673essLes\xf3\u0a48Line;\u400ar;\uc000\ud835\udd11\u0200Bnpt\u0b22\u0b28\u0b37\u0b3areak;\u6060BreakingSpace;\u40a0f;\u6115\u0680;CDEGHLNPRSTV\u0b55\u0b56\u0b6a\u0b7c\u0ba1\u0beb\u0c04\u0c5e\u0c84\u0ca6\u0cd8\u0d61\u0d85\u6aec\u0100ou\u0b5b\u0b64ngruent;\u6262pCap;\u626doubleVerticalBar;\u6226\u0180lqx\u0b83\u0b8a\u0b9bement;\u6209ual\u0100;T\u0b92\u0b93\u6260ilde;\uc000\u2242\u0338ists;\u6204reater\u0380;EFGLST\u0bb6\u0bb7\u0bbd\u0bc9\u0bd3\u0bd8\u0be5\u626fqual;\u6271ullEqual;\uc000\u2267\u0338reater;\uc000\u226b\u0338ess;\u6279lantEqual;\uc000\u2a7e\u0338ilde;\u6275ump\u0144\u0bf2\u0bfdownHump;\uc000\u224e\u0338qual;\uc000\u224f\u0338e\u0100fs\u0c0a\u0c27tTriangle\u0180;BE\u0c1a\u0c1b\u0c21\u62eaar;\uc000\u29cf\u0338qual;\u62ecs\u0300;EGLST\u0c35\u0c36\u0c3c\u0c44\u0c4b\u0c58\u626equal;\u6270reater;\u6278ess;\uc000\u226a\u0338lantEqual;\uc000\u2a7d\u0338ilde;\u6274ested\u0100GL\u0c68\u0c79reaterGreater;\uc000\u2aa2\u0338essLess;\uc000\u2aa1\u0338recedes\u0180;ES\u0c92\u0c93\u0c9b\u6280qual;\uc000\u2aaf\u0338lantEqual;\u62e0\u0100ei\u0cab\u0cb9verseElement;\u620cghtTriangle\u0180;BE\u0ccb\u0ccc\u0cd2\u62ebar;\uc000\u29d0\u0338qual;\u62ed\u0100qu\u0cdd\u0d0cuareSu\u0100bp\u0ce8\u0cf9set\u0100;E\u0cf0\u0cf3\uc000\u228f\u0338qual;\u62e2erset\u0100;E\u0d03\u0d06\uc000\u2290\u0338qual;\u62e3\u0180bcp\u0d13\u0d24\u0d4eset\u0100;E\u0d1b\u0d1e\uc000\u2282\u20d2qual;\u6288ceeds\u0200;EST\u0d32\u0d33\u0d3b\u0d46\u6281qual;\uc000\u2ab0\u0338lantEqual;\u62e1ilde;\uc000\u227f\u0338erset\u0100;E\u0d58\u0d5b\uc000\u2283\u20d2qual;\u6289ilde\u0200;EFT\u0d6e\u0d6f\u0d75\u0d7f\u6241qual;\u6244ullEqual;\u6247ilde;\u6249erticalBar;\u6224cr;\uc000\ud835\udca9ilde\u803b\xd1\u40d1;\u439d\u0700Eacdfgmoprstuv\u0dbd\u0dc2\u0dc9\u0dd5\u0ddb\u0de0\u0de7\u0dfc\u0e02\u0e20\u0e22\u0e32\u0e3f\u0e44lig;\u4152cute\u803b\xd3\u40d3\u0100iy\u0dce\u0dd3rc\u803b\xd4\u40d4;\u441eblac;\u4150r;\uc000\ud835\udd12rave\u803b\xd2\u40d2\u0180aei\u0dee\u0df2\u0df6cr;\u414cga;\u43a9cron;\u439fpf;\uc000\ud835\udd46enCurly\u0100DQ\u0e0e\u0e1aoubleQuote;\u601cuote;\u6018;\u6a54\u0100cl\u0e27\u0e2cr;\uc000\ud835\udcaaash\u803b\xd8\u40d8i\u016c\u0e37\u0e3cde\u803b\xd5\u40d5es;\u6a37ml\u803b\xd6\u40d6er\u0100BP\u0e4b\u0e60\u0100ar\u0e50\u0e53r;\u603eac\u0100ek\u0e5a\u0e5c;\u63deet;\u63b4arenthesis;\u63dc\u0480acfhilors\u0e7f\u0e87\u0e8a\u0e8f\u0e92\u0e94\u0e9d\u0eb0\u0efcrtialD;\u6202y;\u441fr;\uc000\ud835\udd13i;\u43a6;\u43a0usMinus;\u40b1\u0100ip\u0ea2\u0eadncareplan\xe5\u069df;\u6119\u0200;eio\u0eb9\u0eba\u0ee0\u0ee4\u6abbcedes\u0200;EST\u0ec8\u0ec9\u0ecf\u0eda\u627aqual;\u6aaflantEqual;\u627cilde;\u627eme;\u6033\u0100dp\u0ee9\u0eeeuct;\u620fortion\u0100;a\u0225\u0ef9l;\u621d\u0100ci\u0f01\u0f06r;\uc000\ud835\udcab;\u43a8\u0200Ufos\u0f11\u0f16\u0f1b\u0f1fOT\u803b\"\u4022r;\uc000\ud835\udd14pf;\u611acr;\uc000\ud835\udcac\u0600BEacefhiorsu\u0f3e\u0f43\u0f47\u0f60\u0f73\u0fa7\u0faa\u0fad\u1096\u10a9\u10b4\u10bearr;\u6910G\u803b\xae\u40ae\u0180cnr\u0f4e\u0f53\u0f56ute;\u4154g;\u67ebr\u0100;t\u0f5c\u0f5d\u61a0l;\u6916\u0180aey\u0f67\u0f6c\u0f71ron;\u4158dil;\u4156;\u4420\u0100;v\u0f78\u0f79\u611cerse\u0100EU\u0f82\u0f99\u0100lq\u0f87\u0f8eement;\u620builibrium;\u61cbpEquilibrium;\u696fr\xbb\u0f79o;\u43a1ght\u0400ACDFTUVa\u0fc1\u0feb\u0ff3\u1022\u1028\u105b\u1087\u03d8\u0100nr\u0fc6\u0fd2gleBracket;\u67e9row\u0180;BL\u0fdc\u0fdd\u0fe1\u6192ar;\u61e5eftArrow;\u61c4eiling;\u6309o\u01f5\u0ff9\0\u1005bleBracket;\u67e7n\u01d4\u100a\0\u1014eeVector;\u695dector\u0100;B\u101d\u101e\u61c2ar;\u6955loor;\u630b\u0100er\u102d\u1043e\u0180;AV\u1035\u1036\u103c\u62a2rrow;\u61a6ector;\u695biangle\u0180;BE\u1050\u1051\u1055\u62b3ar;\u69d0qual;\u62b5p\u0180DTV\u1063\u106e\u1078ownVector;\u694feeVector;\u695cector\u0100;B\u1082\u1083\u61bear;\u6954ector\u0100;B\u1091\u1092\u61c0ar;\u6953\u0100pu\u109b\u109ef;\u611dndImplies;\u6970ightarrow;\u61db\u0100ch\u10b9\u10bcr;\u611b;\u61b1leDelayed;\u69f4\u0680HOacfhimoqstu\u10e4\u10f1\u10f7\u10fd\u1119\u111e\u1151\u1156\u1161\u1167\u11b5\u11bb\u11bf\u0100Cc\u10e9\u10eeHcy;\u4429y;\u4428FTcy;\u442ccute;\u415a\u0280;aeiy\u1108\u1109\u110e\u1113\u1117\u6abcron;\u4160dil;\u415erc;\u415c;\u4421r;\uc000\ud835\udd16ort\u0200DLRU\u112a\u1134\u113e\u1149ownArrow\xbb\u041eeftArrow\xbb\u089aightArrow\xbb\u0fddpArrow;\u6191gma;\u43a3allCircle;\u6218pf;\uc000\ud835\udd4a\u0272\u116d\0\0\u1170t;\u621aare\u0200;ISU\u117b\u117c\u1189\u11af\u65a1ntersection;\u6293u\u0100bp\u118f\u119eset\u0100;E\u1197\u1198\u628fqual;\u6291erset\u0100;E\u11a8\u11a9\u6290qual;\u6292nion;\u6294cr;\uc000\ud835\udcaear;\u62c6\u0200bcmp\u11c8\u11db\u1209\u120b\u0100;s\u11cd\u11ce\u62d0et\u0100;E\u11cd\u11d5qual;\u6286\u0100ch\u11e0\u1205eeds\u0200;EST\u11ed\u11ee\u11f4\u11ff\u627bqual;\u6ab0lantEqual;\u627dilde;\u627fTh\xe1\u0f8c;\u6211\u0180;es\u1212\u1213\u1223\u62d1rset\u0100;E\u121c\u121d\u6283qual;\u6287et\xbb\u1213\u0580HRSacfhiors\u123e\u1244\u1249\u1255\u125e\u1271\u1276\u129f\u12c2\u12c8\u12d1ORN\u803b\xde\u40deADE;\u6122\u0100Hc\u124e\u1252cy;\u440by;\u4426\u0100bu\u125a\u125c;\u4009;\u43a4\u0180aey\u1265\u126a\u126fron;\u4164dil;\u4162;\u4422r;\uc000\ud835\udd17\u0100ei\u127b\u1289\u01f2\u1280\0\u1287efore;\u6234a;\u4398\u0100cn\u128e\u1298kSpace;\uc000\u205f\u200aSpace;\u6009lde\u0200;EFT\u12ab\u12ac\u12b2\u12bc\u623cqual;\u6243ullEqual;\u6245ilde;\u6248pf;\uc000\ud835\udd4bipleDot;\u60db\u0100ct\u12d6\u12dbr;\uc000\ud835\udcafrok;\u4166\u0ae1\u12f7\u130e\u131a\u1326\0\u132c\u1331\0\0\0\0\0\u1338\u133d\u1377\u1385\0\u13ff\u1404\u140a\u1410\u0100cr\u12fb\u1301ute\u803b\xda\u40dar\u0100;o\u1307\u1308\u619fcir;\u6949r\u01e3\u1313\0\u1316y;\u440eve;\u416c\u0100iy\u131e\u1323rc\u803b\xdb\u40db;\u4423blac;\u4170r;\uc000\ud835\udd18rave\u803b\xd9\u40d9acr;\u416a\u0100di\u1341\u1369er\u0100BP\u1348\u135d\u0100ar\u134d\u1350r;\u405fac\u0100ek\u1357\u1359;\u63dfet;\u63b5arenthesis;\u63ddon\u0100;P\u1370\u1371\u62c3lus;\u628e\u0100gp\u137b\u137fon;\u4172f;\uc000\ud835\udd4c\u0400ADETadps\u1395\u13ae\u13b8\u13c4\u03e8\u13d2\u13d7\u13f3rrow\u0180;BD\u1150\u13a0\u13a4ar;\u6912ownArrow;\u61c5ownArrow;\u6195quilibrium;\u696eee\u0100;A\u13cb\u13cc\u62a5rrow;\u61a5own\xe1\u03f3er\u0100LR\u13de\u13e8eftArrow;\u6196ightArrow;\u6197i\u0100;l\u13f9\u13fa\u43d2on;\u43a5ing;\u416ecr;\uc000\ud835\udcb0ilde;\u4168ml\u803b\xdc\u40dc\u0480Dbcdefosv\u1427\u142c\u1430\u1433\u143e\u1485\u148a\u1490\u1496ash;\u62abar;\u6aeby;\u4412ash\u0100;l\u143b\u143c\u62a9;\u6ae6\u0100er\u1443\u1445;\u62c1\u0180bty\u144c\u1450\u147aar;\u6016\u0100;i\u144f\u1455cal\u0200BLST\u1461\u1465\u146a\u1474ar;\u6223ine;\u407ceparator;\u6758ilde;\u6240ThinSpace;\u600ar;\uc000\ud835\udd19pf;\uc000\ud835\udd4dcr;\uc000\ud835\udcb1dash;\u62aa\u0280cefos\u14a7\u14ac\u14b1\u14b6\u14bcirc;\u4174dge;\u62c0r;\uc000\ud835\udd1apf;\uc000\ud835\udd4ecr;\uc000\ud835\udcb2\u0200fios\u14cb\u14d0\u14d2\u14d8r;\uc000\ud835\udd1b;\u439epf;\uc000\ud835\udd4fcr;\uc000\ud835\udcb3\u0480AIUacfosu\u14f1\u14f5\u14f9\u14fd\u1504\u150f\u1514\u151a\u1520cy;\u442fcy;\u4407cy;\u442ecute\u803b\xdd\u40dd\u0100iy\u1509\u150drc;\u4176;\u442br;\uc000\ud835\udd1cpf;\uc000\ud835\udd50cr;\uc000\ud835\udcb4ml;\u4178\u0400Hacdefos\u1535\u1539\u153f\u154b\u154f\u155d\u1560\u1564cy;\u4416cute;\u4179\u0100ay\u1544\u1549ron;\u417d;\u4417ot;\u417b\u01f2\u1554\0\u155boWidt\xe8\u0ad9a;\u4396r;\u6128pf;\u6124cr;\uc000\ud835\udcb5\u0be1\u1583\u158a\u1590\0\u15b0\u15b6\u15bf\0\0\0\0\u15c6\u15db\u15eb\u165f\u166d\0\u1695\u169b\u16b2\u16b9\0\u16becute\u803b\xe1\u40e1reve;\u4103\u0300;Ediuy\u159c\u159d\u15a1\u15a3\u15a8\u15ad\u623e;\uc000\u223e\u0333;\u623frc\u803b\xe2\u40e2te\u80bb\xb4\u0306;\u4430lig\u803b\xe6\u40e6\u0100;r\xb2\u15ba;\uc000\ud835\udd1erave\u803b\xe0\u40e0\u0100ep\u15ca\u15d6\u0100fp\u15cf\u15d4sym;\u6135\xe8\u15d3ha;\u43b1\u0100ap\u15dfc\u0100cl\u15e4\u15e7r;\u4101g;\u6a3f\u0264\u15f0\0\0\u160a\u0280;adsv\u15fa\u15fb\u15ff\u1601\u1607\u6227nd;\u6a55;\u6a5clope;\u6a58;\u6a5a\u0380;elmrsz\u1618\u1619\u161b\u161e\u163f\u164f\u1659\u6220;\u69a4e\xbb\u1619sd\u0100;a\u1625\u1626\u6221\u0461\u1630\u1632\u1634\u1636\u1638\u163a\u163c\u163e;\u69a8;\u69a9;\u69aa;\u69ab;\u69ac;\u69ad;\u69ae;\u69aft\u0100;v\u1645\u1646\u621fb\u0100;d\u164c\u164d\u62be;\u699d\u0100pt\u1654\u1657h;\u6222\xbb\xb9arr;\u637c\u0100gp\u1663\u1667on;\u4105f;\uc000\ud835\udd52\u0380;Eaeiop\u12c1\u167b\u167d\u1682\u1684\u1687\u168a;\u6a70cir;\u6a6f;\u624ad;\u624bs;\u4027rox\u0100;e\u12c1\u1692\xf1\u1683ing\u803b\xe5\u40e5\u0180cty\u16a1\u16a6\u16a8r;\uc000\ud835\udcb6;\u402amp\u0100;e\u12c1\u16af\xf1\u0288ilde\u803b\xe3\u40e3ml\u803b\xe4\u40e4\u0100ci\u16c2\u16c8onin\xf4\u0272nt;\u6a11\u0800Nabcdefiklnoprsu\u16ed\u16f1\u1730\u173c\u1743\u1748\u1778\u177d\u17e0\u17e6\u1839\u1850\u170d\u193d\u1948\u1970ot;\u6aed\u0100cr\u16f6\u171ek\u0200ceps\u1700\u1705\u170d\u1713ong;\u624cpsilon;\u43f6rime;\u6035im\u0100;e\u171a\u171b\u623dq;\u62cd\u0176\u1722\u1726ee;\u62bded\u0100;g\u172c\u172d\u6305e\xbb\u172drk\u0100;t\u135c\u1737brk;\u63b6\u0100oy\u1701\u1741;\u4431quo;\u601e\u0280cmprt\u1753\u175b\u1761\u1764\u1768aus\u0100;e\u010a\u0109ptyv;\u69b0s\xe9\u170cno\xf5\u0113\u0180ahw\u176f\u1771\u1773;\u43b2;\u6136een;\u626cr;\uc000\ud835\udd1fg\u0380costuvw\u178d\u179d\u17b3\u17c1\u17d5\u17db\u17de\u0180aiu\u1794\u1796\u179a\xf0\u0760rc;\u65efp\xbb\u1371\u0180dpt\u17a4\u17a8\u17adot;\u6a00lus;\u6a01imes;\u6a02\u0271\u17b9\0\0\u17becup;\u6a06ar;\u6605riangle\u0100du\u17cd\u17d2own;\u65bdp;\u65b3plus;\u6a04e\xe5\u1444\xe5\u14adarow;\u690d\u0180ako\u17ed\u1826\u1835\u0100cn\u17f2\u1823k\u0180lst\u17fa\u05ab\u1802ozenge;\u69ebriangle\u0200;dlr\u1812\u1813\u1818\u181d\u65b4own;\u65beeft;\u65c2ight;\u65b8k;\u6423\u01b1\u182b\0\u1833\u01b2\u182f\0\u1831;\u6592;\u65914;\u6593ck;\u6588\u0100eo\u183e\u184d\u0100;q\u1843\u1846\uc000=\u20e5uiv;\uc000\u2261\u20e5t;\u6310\u0200ptwx\u1859\u185e\u1867\u186cf;\uc000\ud835\udd53\u0100;t\u13cb\u1863om\xbb\u13cctie;\u62c8\u0600DHUVbdhmptuv\u1885\u1896\u18aa\u18bb\u18d7\u18db\u18ec\u18ff\u1905\u190a\u1910\u1921\u0200LRlr\u188e\u1890\u1892\u1894;\u6557;\u6554;\u6556;\u6553\u0280;DUdu\u18a1\u18a2\u18a4\u18a6\u18a8\u6550;\u6566;\u6569;\u6564;\u6567\u0200LRlr\u18b3\u18b5\u18b7\u18b9;\u655d;\u655a;\u655c;\u6559\u0380;HLRhlr\u18ca\u18cb\u18cd\u18cf\u18d1\u18d3\u18d5\u6551;\u656c;\u6563;\u6560;\u656b;\u6562;\u655fox;\u69c9\u0200LRlr\u18e4\u18e6\u18e8\u18ea;\u6555;\u6552;\u6510;\u650c\u0280;DUdu\u06bd\u18f7\u18f9\u18fb\u18fd;\u6565;\u6568;\u652c;\u6534inus;\u629flus;\u629eimes;\u62a0\u0200LRlr\u1919\u191b\u191d\u191f;\u655b;\u6558;\u6518;\u6514\u0380;HLRhlr\u1930\u1931\u1933\u1935\u1937\u1939\u193b\u6502;\u656a;\u6561;\u655e;\u653c;\u6524;\u651c\u0100ev\u0123\u1942bar\u803b\xa6\u40a6\u0200ceio\u1951\u1956\u195a\u1960r;\uc000\ud835\udcb7mi;\u604fm\u0100;e\u171a\u171cl\u0180;bh\u1968\u1969\u196b\u405c;\u69c5sub;\u67c8\u016c\u1974\u197el\u0100;e\u1979\u197a\u6022t\xbb\u197ap\u0180;Ee\u012f\u1985\u1987;\u6aae\u0100;q\u06dc\u06db\u0ce1\u19a7\0\u19e8\u1a11\u1a15\u1a32\0\u1a37\u1a50\0\0\u1ab4\0\0\u1ac1\0\0\u1b21\u1b2e\u1b4d\u1b52\0\u1bfd\0\u1c0c\u0180cpr\u19ad\u19b2\u19ddute;\u4107\u0300;abcds\u19bf\u19c0\u19c4\u19ca\u19d5\u19d9\u6229nd;\u6a44rcup;\u6a49\u0100au\u19cf\u19d2p;\u6a4bp;\u6a47ot;\u6a40;\uc000\u2229\ufe00\u0100eo\u19e2\u19e5t;\u6041\xee\u0693\u0200aeiu\u19f0\u19fb\u1a01\u1a05\u01f0\u19f5\0\u19f8s;\u6a4don;\u410ddil\u803b\xe7\u40e7rc;\u4109ps\u0100;s\u1a0c\u1a0d\u6a4cm;\u6a50ot;\u410b\u0180dmn\u1a1b\u1a20\u1a26il\u80bb\xb8\u01adptyv;\u69b2t\u8100\xa2;e\u1a2d\u1a2e\u40a2r\xe4\u01b2r;\uc000\ud835\udd20\u0180cei\u1a3d\u1a40\u1a4dy;\u4447ck\u0100;m\u1a47\u1a48\u6713ark\xbb\u1a48;\u43c7r\u0380;Ecefms\u1a5f\u1a60\u1a62\u1a6b\u1aa4\u1aaa\u1aae\u65cb;\u69c3\u0180;el\u1a69\u1a6a\u1a6d\u42c6q;\u6257e\u0261\u1a74\0\0\u1a88rrow\u0100lr\u1a7c\u1a81eft;\u61baight;\u61bb\u0280RSacd\u1a92\u1a94\u1a96\u1a9a\u1a9f\xbb\u0f47;\u64c8st;\u629birc;\u629aash;\u629dnint;\u6a10id;\u6aefcir;\u69c2ubs\u0100;u\u1abb\u1abc\u6663it\xbb\u1abc\u02ec\u1ac7\u1ad4\u1afa\0\u1b0aon\u0100;e\u1acd\u1ace\u403a\u0100;q\xc7\xc6\u026d\u1ad9\0\0\u1ae2a\u0100;t\u1ade\u1adf\u402c;\u4040\u0180;fl\u1ae8\u1ae9\u1aeb\u6201\xee\u1160e\u0100mx\u1af1\u1af6ent\xbb\u1ae9e\xf3\u024d\u01e7\u1afe\0\u1b07\u0100;d\u12bb\u1b02ot;\u6a6dn\xf4\u0246\u0180fry\u1b10\u1b14\u1b17;\uc000\ud835\udd54o\xe4\u0254\u8100\xa9;s\u0155\u1b1dr;\u6117\u0100ao\u1b25\u1b29rr;\u61b5ss;\u6717\u0100cu\u1b32\u1b37r;\uc000\ud835\udcb8\u0100bp\u1b3c\u1b44\u0100;e\u1b41\u1b42\u6acf;\u6ad1\u0100;e\u1b49\u1b4a\u6ad0;\u6ad2dot;\u62ef\u0380delprvw\u1b60\u1b6c\u1b77\u1b82\u1bac\u1bd4\u1bf9arr\u0100lr\u1b68\u1b6a;\u6938;\u6935\u0270\u1b72\0\0\u1b75r;\u62dec;\u62dfarr\u0100;p\u1b7f\u1b80\u61b6;\u693d\u0300;bcdos\u1b8f\u1b90\u1b96\u1ba1\u1ba5\u1ba8\u622arcap;\u6a48\u0100au\u1b9b\u1b9ep;\u6a46p;\u6a4aot;\u628dr;\u6a45;\uc000\u222a\ufe00\u0200alrv\u1bb5\u1bbf\u1bde\u1be3rr\u0100;m\u1bbc\u1bbd\u61b7;\u693cy\u0180evw\u1bc7\u1bd4\u1bd8q\u0270\u1bce\0\0\u1bd2re\xe3\u1b73u\xe3\u1b75ee;\u62ceedge;\u62cfen\u803b\xa4\u40a4earrow\u0100lr\u1bee\u1bf3eft\xbb\u1b80ight\xbb\u1bbde\xe4\u1bdd\u0100ci\u1c01\u1c07onin\xf4\u01f7nt;\u6231lcty;\u632d\u0980AHabcdefhijlorstuwz\u1c38\u1c3b\u1c3f\u1c5d\u1c69\u1c75\u1c8a\u1c9e\u1cac\u1cb7\u1cfb\u1cff\u1d0d\u1d7b\u1d91\u1dab\u1dbb\u1dc6\u1dcdr\xf2\u0381ar;\u6965\u0200glrs\u1c48\u1c4d\u1c52\u1c54ger;\u6020eth;\u6138\xf2\u1133h\u0100;v\u1c5a\u1c5b\u6010\xbb\u090a\u016b\u1c61\u1c67arow;\u690fa\xe3\u0315\u0100ay\u1c6e\u1c73ron;\u410f;\u4434\u0180;ao\u0332\u1c7c\u1c84\u0100gr\u02bf\u1c81r;\u61catseq;\u6a77\u0180glm\u1c91\u1c94\u1c98\u803b\xb0\u40b0ta;\u43b4ptyv;\u69b1\u0100ir\u1ca3\u1ca8sht;\u697f;\uc000\ud835\udd21ar\u0100lr\u1cb3\u1cb5\xbb\u08dc\xbb\u101e\u0280aegsv\u1cc2\u0378\u1cd6\u1cdc\u1ce0m\u0180;os\u0326\u1cca\u1cd4nd\u0100;s\u0326\u1cd1uit;\u6666amma;\u43ddin;\u62f2\u0180;io\u1ce7\u1ce8\u1cf8\u40f7de\u8100\xf7;o\u1ce7\u1cf0ntimes;\u62c7n\xf8\u1cf7cy;\u4452c\u026f\u1d06\0\0\u1d0arn;\u631eop;\u630d\u0280lptuw\u1d18\u1d1d\u1d22\u1d49\u1d55lar;\u4024f;\uc000\ud835\udd55\u0280;emps\u030b\u1d2d\u1d37\u1d3d\u1d42q\u0100;d\u0352\u1d33ot;\u6251inus;\u6238lus;\u6214quare;\u62a1blebarwedg\xe5\xfan\u0180adh\u112e\u1d5d\u1d67ownarrow\xf3\u1c83arpoon\u0100lr\u1d72\u1d76ef\xf4\u1cb4igh\xf4\u1cb6\u0162\u1d7f\u1d85karo\xf7\u0f42\u026f\u1d8a\0\0\u1d8ern;\u631fop;\u630c\u0180cot\u1d98\u1da3\u1da6\u0100ry\u1d9d\u1da1;\uc000\ud835\udcb9;\u4455l;\u69f6rok;\u4111\u0100dr\u1db0\u1db4ot;\u62f1i\u0100;f\u1dba\u1816\u65bf\u0100ah\u1dc0\u1dc3r\xf2\u0429a\xf2\u0fa6angle;\u69a6\u0100ci\u1dd2\u1dd5y;\u445fgrarr;\u67ff\u0900Dacdefglmnopqrstux\u1e01\u1e09\u1e19\u1e38\u0578\u1e3c\u1e49\u1e61\u1e7e\u1ea5\u1eaf\u1ebd\u1ee1\u1f2a\u1f37\u1f44\u1f4e\u1f5a\u0100Do\u1e06\u1d34o\xf4\u1c89\u0100cs\u1e0e\u1e14ute\u803b\xe9\u40e9ter;\u6a6e\u0200aioy\u1e22\u1e27\u1e31\u1e36ron;\u411br\u0100;c\u1e2d\u1e2e\u6256\u803b\xea\u40ealon;\u6255;\u444dot;\u4117\u0100Dr\u1e41\u1e45ot;\u6252;\uc000\ud835\udd22\u0180;rs\u1e50\u1e51\u1e57\u6a9aave\u803b\xe8\u40e8\u0100;d\u1e5c\u1e5d\u6a96ot;\u6a98\u0200;ils\u1e6a\u1e6b\u1e72\u1e74\u6a99nters;\u63e7;\u6113\u0100;d\u1e79\u1e7a\u6a95ot;\u6a97\u0180aps\u1e85\u1e89\u1e97cr;\u4113ty\u0180;sv\u1e92\u1e93\u1e95\u6205et\xbb\u1e93p\u01001;\u1e9d\u1ea4\u0133\u1ea1\u1ea3;\u6004;\u6005\u6003\u0100gs\u1eaa\u1eac;\u414bp;\u6002\u0100gp\u1eb4\u1eb8on;\u4119f;\uc000\ud835\udd56\u0180als\u1ec4\u1ece\u1ed2r\u0100;s\u1eca\u1ecb\u62d5l;\u69e3us;\u6a71i\u0180;lv\u1eda\u1edb\u1edf\u43b5on\xbb\u1edb;\u43f5\u0200csuv\u1eea\u1ef3\u1f0b\u1f23\u0100io\u1eef\u1e31rc\xbb\u1e2e\u0269\u1ef9\0\0\u1efb\xed\u0548ant\u0100gl\u1f02\u1f06tr\xbb\u1e5dess\xbb\u1e7a\u0180aei\u1f12\u1f16\u1f1als;\u403dst;\u625fv\u0100;D\u0235\u1f20D;\u6a78parsl;\u69e5\u0100Da\u1f2f\u1f33ot;\u6253rr;\u6971\u0180cdi\u1f3e\u1f41\u1ef8r;\u612fo\xf4\u0352\u0100ah\u1f49\u1f4b;\u43b7\u803b\xf0\u40f0\u0100mr\u1f53\u1f57l\u803b\xeb\u40ebo;\u60ac\u0180cip\u1f61\u1f64\u1f67l;\u4021s\xf4\u056e\u0100eo\u1f6c\u1f74ctatio\xee\u0559nential\xe5\u0579\u09e1\u1f92\0\u1f9e\0\u1fa1\u1fa7\0\0\u1fc6\u1fcc\0\u1fd3\0\u1fe6\u1fea\u2000\0\u2008\u205allingdotse\xf1\u1e44y;\u4444male;\u6640\u0180ilr\u1fad\u1fb3\u1fc1lig;\u8000\ufb03\u0269\u1fb9\0\0\u1fbdg;\u8000\ufb00ig;\u8000\ufb04;\uc000\ud835\udd23lig;\u8000\ufb01lig;\uc000fj\u0180alt\u1fd9\u1fdc\u1fe1t;\u666dig;\u8000\ufb02ns;\u65b1of;\u4192\u01f0\u1fee\0\u1ff3f;\uc000\ud835\udd57\u0100ak\u05bf\u1ff7\u0100;v\u1ffc\u1ffd\u62d4;\u6ad9artint;\u6a0d\u0100ao\u200c\u2055\u0100cs\u2011\u2052\u03b1\u201a\u2030\u2038\u2045\u2048\0\u2050\u03b2\u2022\u2025\u2027\u202a\u202c\0\u202e\u803b\xbd\u40bd;\u6153\u803b\xbc\u40bc;\u6155;\u6159;\u615b\u01b3\u2034\0\u2036;\u6154;\u6156\u02b4\u203e\u2041\0\0\u2043\u803b\xbe\u40be;\u6157;\u615c5;\u6158\u01b6\u204c\0\u204e;\u615a;\u615d8;\u615el;\u6044wn;\u6322cr;\uc000\ud835\udcbb\u0880Eabcdefgijlnorstv\u2082\u2089\u209f\u20a5\u20b0\u20b4\u20f0\u20f5\u20fa\u20ff\u2103\u2112\u2138\u0317\u213e\u2152\u219e\u0100;l\u064d\u2087;\u6a8c\u0180cmp\u2090\u2095\u209dute;\u41f5ma\u0100;d\u209c\u1cda\u43b3;\u6a86reve;\u411f\u0100iy\u20aa\u20aerc;\u411d;\u4433ot;\u4121\u0200;lqs\u063e\u0642\u20bd\u20c9\u0180;qs\u063e\u064c\u20c4lan\xf4\u0665\u0200;cdl\u0665\u20d2\u20d5\u20e5c;\u6aa9ot\u0100;o\u20dc\u20dd\u6a80\u0100;l\u20e2\u20e3\u6a82;\u6a84\u0100;e\u20ea\u20ed\uc000\u22db\ufe00s;\u6a94r;\uc000\ud835\udd24\u0100;g\u0673\u061bmel;\u6137cy;\u4453\u0200;Eaj\u065a\u210c\u210e\u2110;\u6a92;\u6aa5;\u6aa4\u0200Eaes\u211b\u211d\u2129\u2134;\u6269p\u0100;p\u2123\u2124\u6a8arox\xbb\u2124\u0100;q\u212e\u212f\u6a88\u0100;q\u212e\u211bim;\u62e7pf;\uc000\ud835\udd58\u0100ci\u2143\u2146r;\u610am\u0180;el\u066b\u214e\u2150;\u6a8e;\u6a90\u8300>;cdlqr\u05ee\u2160\u216a\u216e\u2173\u2179\u0100ci\u2165\u2167;\u6aa7r;\u6a7aot;\u62d7Par;\u6995uest;\u6a7c\u0280adels\u2184\u216a\u2190\u0656\u219b\u01f0\u2189\0\u218epro\xf8\u209er;\u6978q\u0100lq\u063f\u2196les\xf3\u2088i\xed\u066b\u0100en\u21a3\u21adrtneqq;\uc000\u2269\ufe00\xc5\u21aa\u0500Aabcefkosy\u21c4\u21c7\u21f1\u21f5\u21fa\u2218\u221d\u222f\u2268\u227dr\xf2\u03a0\u0200ilmr\u21d0\u21d4\u21d7\u21dbrs\xf0\u1484f\xbb\u2024il\xf4\u06a9\u0100dr\u21e0\u21e4cy;\u444a\u0180;cw\u08f4\u21eb\u21efir;\u6948;\u61adar;\u610firc;\u4125\u0180alr\u2201\u220e\u2213rts\u0100;u\u2209\u220a\u6665it\xbb\u220alip;\u6026con;\u62b9r;\uc000\ud835\udd25s\u0100ew\u2223\u2229arow;\u6925arow;\u6926\u0280amopr\u223a\u223e\u2243\u225e\u2263rr;\u61fftht;\u623bk\u0100lr\u2249\u2253eftarrow;\u61a9ightarrow;\u61aaf;\uc000\ud835\udd59bar;\u6015\u0180clt\u226f\u2274\u2278r;\uc000\ud835\udcbdas\xe8\u21f4rok;\u4127\u0100bp\u2282\u2287ull;\u6043hen\xbb\u1c5b\u0ae1\u22a3\0\u22aa\0\u22b8\u22c5\u22ce\0\u22d5\u22f3\0\0\u22f8\u2322\u2367\u2362\u237f\0\u2386\u23aa\u23b4cute\u803b\xed\u40ed\u0180;iy\u0771\u22b0\u22b5rc\u803b\xee\u40ee;\u4438\u0100cx\u22bc\u22bfy;\u4435cl\u803b\xa1\u40a1\u0100fr\u039f\u22c9;\uc000\ud835\udd26rave\u803b\xec\u40ec\u0200;ino\u073e\u22dd\u22e9\u22ee\u0100in\u22e2\u22e6nt;\u6a0ct;\u622dfin;\u69dcta;\u6129lig;\u4133\u0180aop\u22fe\u231a\u231d\u0180cgt\u2305\u2308\u2317r;\u412b\u0180elp\u071f\u230f\u2313in\xe5\u078ear\xf4\u0720h;\u4131f;\u62b7ed;\u41b5\u0280;cfot\u04f4\u232c\u2331\u233d\u2341are;\u6105in\u0100;t\u2338\u2339\u621eie;\u69dddo\xf4\u2319\u0280;celp\u0757\u234c\u2350\u235b\u2361al;\u62ba\u0100gr\u2355\u2359er\xf3\u1563\xe3\u234darhk;\u6a17rod;\u6a3c\u0200cgpt\u236f\u2372\u2376\u237by;\u4451on;\u412ff;\uc000\ud835\udd5aa;\u43b9uest\u803b\xbf\u40bf\u0100ci\u238a\u238fr;\uc000\ud835\udcben\u0280;Edsv\u04f4\u239b\u239d\u23a1\u04f3;\u62f9ot;\u62f5\u0100;v\u23a6\u23a7\u62f4;\u62f3\u0100;i\u0777\u23aelde;\u4129\u01eb\u23b8\0\u23bccy;\u4456l\u803b\xef\u40ef\u0300cfmosu\u23cc\u23d7\u23dc\u23e1\u23e7\u23f5\u0100iy\u23d1\u23d5rc;\u4135;\u4439r;\uc000\ud835\udd27ath;\u4237pf;\uc000\ud835\udd5b\u01e3\u23ec\0\u23f1r;\uc000\ud835\udcbfrcy;\u4458kcy;\u4454\u0400acfghjos\u240b\u2416\u2422\u2427\u242d\u2431\u2435\u243bppa\u0100;v\u2413\u2414\u43ba;\u43f0\u0100ey\u241b\u2420dil;\u4137;\u443ar;\uc000\ud835\udd28reen;\u4138cy;\u4445cy;\u445cpf;\uc000\ud835\udd5ccr;\uc000\ud835\udcc0\u0b80ABEHabcdefghjlmnoprstuv\u2470\u2481\u2486\u248d\u2491\u250e\u253d\u255a\u2580\u264e\u265e\u2665\u2679\u267d\u269a\u26b2\u26d8\u275d\u2768\u278b\u27c0\u2801\u2812\u0180art\u2477\u247a\u247cr\xf2\u09c6\xf2\u0395ail;\u691barr;\u690e\u0100;g\u0994\u248b;\u6a8bar;\u6962\u0963\u24a5\0\u24aa\0\u24b1\0\0\0\0\0\u24b5\u24ba\0\u24c6\u24c8\u24cd\0\u24f9ute;\u413amptyv;\u69b4ra\xee\u084cbda;\u43bbg\u0180;dl\u088e\u24c1\u24c3;\u6991\xe5\u088e;\u6a85uo\u803b\xab\u40abr\u0400;bfhlpst\u0899\u24de\u24e6\u24e9\u24eb\u24ee\u24f1\u24f5\u0100;f\u089d\u24e3s;\u691fs;\u691d\xeb\u2252p;\u61abl;\u6939im;\u6973l;\u61a2\u0180;ae\u24ff\u2500\u2504\u6aabil;\u6919\u0100;s\u2509\u250a\u6aad;\uc000\u2aad\ufe00\u0180abr\u2515\u2519\u251drr;\u690crk;\u6772\u0100ak\u2522\u252cc\u0100ek\u2528\u252a;\u407b;\u405b\u0100es\u2531\u2533;\u698bl\u0100du\u2539\u253b;\u698f;\u698d\u0200aeuy\u2546\u254b\u2556\u2558ron;\u413e\u0100di\u2550\u2554il;\u413c\xec\u08b0\xe2\u2529;\u443b\u0200cqrs\u2563\u2566\u256d\u257da;\u6936uo\u0100;r\u0e19\u1746\u0100du\u2572\u2577har;\u6967shar;\u694bh;\u61b2\u0280;fgqs\u258b\u258c\u0989\u25f3\u25ff\u6264t\u0280ahlrt\u2598\u25a4\u25b7\u25c2\u25e8rrow\u0100;t\u0899\u25a1a\xe9\u24f6arpoon\u0100du\u25af\u25b4own\xbb\u045ap\xbb\u0966eftarrows;\u61c7ight\u0180ahs\u25cd\u25d6\u25derrow\u0100;s\u08f4\u08a7arpoon\xf3\u0f98quigarro\xf7\u21f0hreetimes;\u62cb\u0180;qs\u258b\u0993\u25falan\xf4\u09ac\u0280;cdgs\u09ac\u260a\u260d\u261d\u2628c;\u6aa8ot\u0100;o\u2614\u2615\u6a7f\u0100;r\u261a\u261b\u6a81;\u6a83\u0100;e\u2622\u2625\uc000\u22da\ufe00s;\u6a93\u0280adegs\u2633\u2639\u263d\u2649\u264bppro\xf8\u24c6ot;\u62d6q\u0100gq\u2643\u2645\xf4\u0989gt\xf2\u248c\xf4\u099bi\xed\u09b2\u0180ilr\u2655\u08e1\u265asht;\u697c;\uc000\ud835\udd29\u0100;E\u099c\u2663;\u6a91\u0161\u2669\u2676r\u0100du\u25b2\u266e\u0100;l\u0965\u2673;\u696alk;\u6584cy;\u4459\u0280;acht\u0a48\u2688\u268b\u2691\u2696r\xf2\u25c1orne\xf2\u1d08ard;\u696bri;\u65fa\u0100io\u269f\u26a4dot;\u4140ust\u0100;a\u26ac\u26ad\u63b0che\xbb\u26ad\u0200Eaes\u26bb\u26bd\u26c9\u26d4;\u6268p\u0100;p\u26c3\u26c4\u6a89rox\xbb\u26c4\u0100;q\u26ce\u26cf\u6a87\u0100;q\u26ce\u26bbim;\u62e6\u0400abnoptwz\u26e9\u26f4\u26f7\u271a\u272f\u2741\u2747\u2750\u0100nr\u26ee\u26f1g;\u67ecr;\u61fdr\xeb\u08c1g\u0180lmr\u26ff\u270d\u2714eft\u0100ar\u09e6\u2707ight\xe1\u09f2apsto;\u67fcight\xe1\u09fdparrow\u0100lr\u2725\u2729ef\xf4\u24edight;\u61ac\u0180afl\u2736\u2739\u273dr;\u6985;\uc000\ud835\udd5dus;\u6a2dimes;\u6a34\u0161\u274b\u274fst;\u6217\xe1\u134e\u0180;ef\u2757\u2758\u1800\u65cange\xbb\u2758ar\u0100;l\u2764\u2765\u4028t;\u6993\u0280achmt\u2773\u2776\u277c\u2785\u2787r\xf2\u08a8orne\xf2\u1d8car\u0100;d\u0f98\u2783;\u696d;\u600eri;\u62bf\u0300achiqt\u2798\u279d\u0a40\u27a2\u27ae\u27bbquo;\u6039r;\uc000\ud835\udcc1m\u0180;eg\u09b2\u27aa\u27ac;\u6a8d;\u6a8f\u0100bu\u252a\u27b3o\u0100;r\u0e1f\u27b9;\u601arok;\u4142\u8400<;cdhilqr\u082b\u27d2\u2639\u27dc\u27e0\u27e5\u27ea\u27f0\u0100ci\u27d7\u27d9;\u6aa6r;\u6a79re\xe5\u25f2mes;\u62c9arr;\u6976uest;\u6a7b\u0100Pi\u27f5\u27f9ar;\u6996\u0180;ef\u2800\u092d\u181b\u65c3r\u0100du\u2807\u280dshar;\u694ahar;\u6966\u0100en\u2817\u2821rtneqq;\uc000\u2268\ufe00\xc5\u281e\u0700Dacdefhilnopsu\u2840\u2845\u2882\u288e\u2893\u28a0\u28a5\u28a8\u28da\u28e2\u28e4\u0a83\u28f3\u2902Dot;\u623a\u0200clpr\u284e\u2852\u2863\u287dr\u803b\xaf\u40af\u0100et\u2857\u2859;\u6642\u0100;e\u285e\u285f\u6720se\xbb\u285f\u0100;s\u103b\u2868to\u0200;dlu\u103b\u2873\u2877\u287bow\xee\u048cef\xf4\u090f\xf0\u13d1ker;\u65ae\u0100oy\u2887\u288cmma;\u6a29;\u443cash;\u6014asuredangle\xbb\u1626r;\uc000\ud835\udd2ao;\u6127\u0180cdn\u28af\u28b4\u28c9ro\u803b\xb5\u40b5\u0200;acd\u1464\u28bd\u28c0\u28c4s\xf4\u16a7ir;\u6af0ot\u80bb\xb7\u01b5us\u0180;bd\u28d2\u1903\u28d3\u6212\u0100;u\u1d3c\u28d8;\u6a2a\u0163\u28de\u28e1p;\u6adb\xf2\u2212\xf0\u0a81\u0100dp\u28e9\u28eeels;\u62a7f;\uc000\ud835\udd5e\u0100ct\u28f8\u28fdr;\uc000\ud835\udcc2pos\xbb\u159d\u0180;lm\u2909\u290a\u290d\u43bctimap;\u62b8\u0c00GLRVabcdefghijlmoprstuvw\u2942\u2953\u297e\u2989\u2998\u29da\u29e9\u2a15\u2a1a\u2a58\u2a5d\u2a83\u2a95\u2aa4\u2aa8\u2b04\u2b07\u2b44\u2b7f\u2bae\u2c34\u2c67\u2c7c\u2ce9\u0100gt\u2947\u294b;\uc000\u22d9\u0338\u0100;v\u2950\u0bcf\uc000\u226b\u20d2\u0180elt\u295a\u2972\u2976ft\u0100ar\u2961\u2967rrow;\u61cdightarrow;\u61ce;\uc000\u22d8\u0338\u0100;v\u297b\u0c47\uc000\u226a\u20d2ightarrow;\u61cf\u0100Dd\u298e\u2993ash;\u62afash;\u62ae\u0280bcnpt\u29a3\u29a7\u29ac\u29b1\u29ccla\xbb\u02deute;\u4144g;\uc000\u2220\u20d2\u0280;Eiop\u0d84\u29bc\u29c0\u29c5\u29c8;\uc000\u2a70\u0338d;\uc000\u224b\u0338s;\u4149ro\xf8\u0d84ur\u0100;a\u29d3\u29d4\u666el\u0100;s\u29d3\u0b38\u01f3\u29df\0\u29e3p\u80bb\xa0\u0b37mp\u0100;e\u0bf9\u0c00\u0280aeouy\u29f4\u29fe\u2a03\u2a10\u2a13\u01f0\u29f9\0\u29fb;\u6a43on;\u4148dil;\u4146ng\u0100;d\u0d7e\u2a0aot;\uc000\u2a6d\u0338p;\u6a42;\u443dash;\u6013\u0380;Aadqsx\u0b92\u2a29\u2a2d\u2a3b\u2a41\u2a45\u2a50rr;\u61d7r\u0100hr\u2a33\u2a36k;\u6924\u0100;o\u13f2\u13f0ot;\uc000\u2250\u0338ui\xf6\u0b63\u0100ei\u2a4a\u2a4ear;\u6928\xed\u0b98ist\u0100;s\u0ba0\u0b9fr;\uc000\ud835\udd2b\u0200Eest\u0bc5\u2a66\u2a79\u2a7c\u0180;qs\u0bbc\u2a6d\u0be1\u0180;qs\u0bbc\u0bc5\u2a74lan\xf4\u0be2i\xed\u0bea\u0100;r\u0bb6\u2a81\xbb\u0bb7\u0180Aap\u2a8a\u2a8d\u2a91r\xf2\u2971rr;\u61aear;\u6af2\u0180;sv\u0f8d\u2a9c\u0f8c\u0100;d\u2aa1\u2aa2\u62fc;\u62facy;\u445a\u0380AEadest\u2ab7\u2aba\u2abe\u2ac2\u2ac5\u2af6\u2af9r\xf2\u2966;\uc000\u2266\u0338rr;\u619ar;\u6025\u0200;fqs\u0c3b\u2ace\u2ae3\u2aeft\u0100ar\u2ad4\u2ad9rro\xf7\u2ac1ightarro\xf7\u2a90\u0180;qs\u0c3b\u2aba\u2aealan\xf4\u0c55\u0100;s\u0c55\u2af4\xbb\u0c36i\xed\u0c5d\u0100;r\u0c35\u2afei\u0100;e\u0c1a\u0c25i\xe4\u0d90\u0100pt\u2b0c\u2b11f;\uc000\ud835\udd5f\u8180\xac;in\u2b19\u2b1a\u2b36\u40acn\u0200;Edv\u0b89\u2b24\u2b28\u2b2e;\uc000\u22f9\u0338ot;\uc000\u22f5\u0338\u01e1\u0b89\u2b33\u2b35;\u62f7;\u62f6i\u0100;v\u0cb8\u2b3c\u01e1\u0cb8\u2b41\u2b43;\u62fe;\u62fd\u0180aor\u2b4b\u2b63\u2b69r\u0200;ast\u0b7b\u2b55\u2b5a\u2b5flle\xec\u0b7bl;\uc000\u2afd\u20e5;\uc000\u2202\u0338lint;\u6a14\u0180;ce\u0c92\u2b70\u2b73u\xe5\u0ca5\u0100;c\u0c98\u2b78\u0100;e\u0c92\u2b7d\xf1\u0c98\u0200Aait\u2b88\u2b8b\u2b9d\u2ba7r\xf2\u2988rr\u0180;cw\u2b94\u2b95\u2b99\u619b;\uc000\u2933\u0338;\uc000\u219d\u0338ghtarrow\xbb\u2b95ri\u0100;e\u0ccb\u0cd6\u0380chimpqu\u2bbd\u2bcd\u2bd9\u2b04\u0b78\u2be4\u2bef\u0200;cer\u0d32\u2bc6\u0d37\u2bc9u\xe5\u0d45;\uc000\ud835\udcc3ort\u026d\u2b05\0\0\u2bd6ar\xe1\u2b56m\u0100;e\u0d6e\u2bdf\u0100;q\u0d74\u0d73su\u0100bp\u2beb\u2bed\xe5\u0cf8\xe5\u0d0b\u0180bcp\u2bf6\u2c11\u2c19\u0200;Ees\u2bff\u2c00\u0d22\u2c04\u6284;\uc000\u2ac5\u0338et\u0100;e\u0d1b\u2c0bq\u0100;q\u0d23\u2c00c\u0100;e\u0d32\u2c17\xf1\u0d38\u0200;Ees\u2c22\u2c23\u0d5f\u2c27\u6285;\uc000\u2ac6\u0338et\u0100;e\u0d58\u2c2eq\u0100;q\u0d60\u2c23\u0200gilr\u2c3d\u2c3f\u2c45\u2c47\xec\u0bd7lde\u803b\xf1\u40f1\xe7\u0c43iangle\u0100lr\u2c52\u2c5ceft\u0100;e\u0c1a\u2c5a\xf1\u0c26ight\u0100;e\u0ccb\u2c65\xf1\u0cd7\u0100;m\u2c6c\u2c6d\u43bd\u0180;es\u2c74\u2c75\u2c79\u4023ro;\u6116p;\u6007\u0480DHadgilrs\u2c8f\u2c94\u2c99\u2c9e\u2ca3\u2cb0\u2cb6\u2cd3\u2ce3ash;\u62adarr;\u6904p;\uc000\u224d\u20d2ash;\u62ac\u0100et\u2ca8\u2cac;\uc000\u2265\u20d2;\uc000>\u20d2nfin;\u69de\u0180Aet\u2cbd\u2cc1\u2cc5rr;\u6902;\uc000\u2264\u20d2\u0100;r\u2cca\u2ccd\uc000<\u20d2ie;\uc000\u22b4\u20d2\u0100At\u2cd8\u2cdcrr;\u6903rie;\uc000\u22b5\u20d2im;\uc000\u223c\u20d2\u0180Aan\u2cf0\u2cf4\u2d02rr;\u61d6r\u0100hr\u2cfa\u2cfdk;\u6923\u0100;o\u13e7\u13e5ear;\u6927\u1253\u1a95\0\0\0\0\0\0\0\0\0\0\0\0\0\u2d2d\0\u2d38\u2d48\u2d60\u2d65\u2d72\u2d84\u1b07\0\0\u2d8d\u2dab\0\u2dc8\u2dce\0\u2ddc\u2e19\u2e2b\u2e3e\u2e43\u0100cs\u2d31\u1a97ute\u803b\xf3\u40f3\u0100iy\u2d3c\u2d45r\u0100;c\u1a9e\u2d42\u803b\xf4\u40f4;\u443e\u0280abios\u1aa0\u2d52\u2d57\u01c8\u2d5alac;\u4151v;\u6a38old;\u69bclig;\u4153\u0100cr\u2d69\u2d6dir;\u69bf;\uc000\ud835\udd2c\u036f\u2d79\0\0\u2d7c\0\u2d82n;\u42dbave\u803b\xf2\u40f2;\u69c1\u0100bm\u2d88\u0df4ar;\u69b5\u0200acit\u2d95\u2d98\u2da5\u2da8r\xf2\u1a80\u0100ir\u2d9d\u2da0r;\u69beoss;\u69bbn\xe5\u0e52;\u69c0\u0180aei\u2db1\u2db5\u2db9cr;\u414dga;\u43c9\u0180cdn\u2dc0\u2dc5\u01cdron;\u43bf;\u69b6pf;\uc000\ud835\udd60\u0180ael\u2dd4\u2dd7\u01d2r;\u69b7rp;\u69b9\u0380;adiosv\u2dea\u2deb\u2dee\u2e08\u2e0d\u2e10\u2e16\u6228r\xf2\u1a86\u0200;efm\u2df7\u2df8\u2e02\u2e05\u6a5dr\u0100;o\u2dfe\u2dff\u6134f\xbb\u2dff\u803b\xaa\u40aa\u803b\xba\u40bagof;\u62b6r;\u6a56lope;\u6a57;\u6a5b\u0180clo\u2e1f\u2e21\u2e27\xf2\u2e01ash\u803b\xf8\u40f8l;\u6298i\u016c\u2e2f\u2e34de\u803b\xf5\u40f5es\u0100;a\u01db\u2e3as;\u6a36ml\u803b\xf6\u40f6bar;\u633d\u0ae1\u2e5e\0\u2e7d\0\u2e80\u2e9d\0\u2ea2\u2eb9\0\0\u2ecb\u0e9c\0\u2f13\0\0\u2f2b\u2fbc\0\u2fc8r\u0200;ast\u0403\u2e67\u2e72\u0e85\u8100\xb6;l\u2e6d\u2e6e\u40b6le\xec\u0403\u0269\u2e78\0\0\u2e7bm;\u6af3;\u6afdy;\u443fr\u0280cimpt\u2e8b\u2e8f\u2e93\u1865\u2e97nt;\u4025od;\u402eil;\u6030enk;\u6031r;\uc000\ud835\udd2d\u0180imo\u2ea8\u2eb0\u2eb4\u0100;v\u2ead\u2eae\u43c6;\u43d5ma\xf4\u0a76ne;\u660e\u0180;tv\u2ebf\u2ec0\u2ec8\u43c0chfork\xbb\u1ffd;\u43d6\u0100au\u2ecf\u2edfn\u0100ck\u2ed5\u2eddk\u0100;h\u21f4\u2edb;\u610e\xf6\u21f4s\u0480;abcdemst\u2ef3\u2ef4\u1908\u2ef9\u2efd\u2f04\u2f06\u2f0a\u2f0e\u402bcir;\u6a23ir;\u6a22\u0100ou\u1d40\u2f02;\u6a25;\u6a72n\u80bb\xb1\u0e9dim;\u6a26wo;\u6a27\u0180ipu\u2f19\u2f20\u2f25ntint;\u6a15f;\uc000\ud835\udd61nd\u803b\xa3\u40a3\u0500;Eaceinosu\u0ec8\u2f3f\u2f41\u2f44\u2f47\u2f81\u2f89\u2f92\u2f7e\u2fb6;\u6ab3p;\u6ab7u\xe5\u0ed9\u0100;c\u0ece\u2f4c\u0300;acens\u0ec8\u2f59\u2f5f\u2f66\u2f68\u2f7eppro\xf8\u2f43urlye\xf1\u0ed9\xf1\u0ece\u0180aes\u2f6f\u2f76\u2f7approx;\u6ab9qq;\u6ab5im;\u62e8i\xed\u0edfme\u0100;s\u2f88\u0eae\u6032\u0180Eas\u2f78\u2f90\u2f7a\xf0\u2f75\u0180dfp\u0eec\u2f99\u2faf\u0180als\u2fa0\u2fa5\u2faalar;\u632eine;\u6312urf;\u6313\u0100;t\u0efb\u2fb4\xef\u0efbrel;\u62b0\u0100ci\u2fc0\u2fc5r;\uc000\ud835\udcc5;\u43c8ncsp;\u6008\u0300fiopsu\u2fda\u22e2\u2fdf\u2fe5\u2feb\u2ff1r;\uc000\ud835\udd2epf;\uc000\ud835\udd62rime;\u6057cr;\uc000\ud835\udcc6\u0180aeo\u2ff8\u3009\u3013t\u0100ei\u2ffe\u3005rnion\xf3\u06b0nt;\u6a16st\u0100;e\u3010\u3011\u403f\xf1\u1f19\xf4\u0f14\u0a80ABHabcdefhilmnoprstux\u3040\u3051\u3055\u3059\u30e0\u310e\u312b\u3147\u3162\u3172\u318e\u3206\u3215\u3224\u3229\u3258\u326e\u3272\u3290\u32b0\u32b7\u0180art\u3047\u304a\u304cr\xf2\u10b3\xf2\u03ddail;\u691car\xf2\u1c65ar;\u6964\u0380cdenqrt\u3068\u3075\u3078\u307f\u308f\u3094\u30cc\u0100eu\u306d\u3071;\uc000\u223d\u0331te;\u4155i\xe3\u116emptyv;\u69b3g\u0200;del\u0fd1\u3089\u308b\u308d;\u6992;\u69a5\xe5\u0fd1uo\u803b\xbb\u40bbr\u0580;abcfhlpstw\u0fdc\u30ac\u30af\u30b7\u30b9\u30bc\u30be\u30c0\u30c3\u30c7\u30cap;\u6975\u0100;f\u0fe0\u30b4s;\u6920;\u6933s;\u691e\xeb\u225d\xf0\u272el;\u6945im;\u6974l;\u61a3;\u619d\u0100ai\u30d1\u30d5il;\u691ao\u0100;n\u30db\u30dc\u6236al\xf3\u0f1e\u0180abr\u30e7\u30ea\u30eer\xf2\u17e5rk;\u6773\u0100ak\u30f3\u30fdc\u0100ek\u30f9\u30fb;\u407d;\u405d\u0100es\u3102\u3104;\u698cl\u0100du\u310a\u310c;\u698e;\u6990\u0200aeuy\u3117\u311c\u3127\u3129ron;\u4159\u0100di\u3121\u3125il;\u4157\xec\u0ff2\xe2\u30fa;\u4440\u0200clqs\u3134\u3137\u313d\u3144a;\u6937dhar;\u6969uo\u0100;r\u020e\u020dh;\u61b3\u0180acg\u314e\u315f\u0f44l\u0200;ips\u0f78\u3158\u315b\u109cn\xe5\u10bbar\xf4\u0fa9t;\u65ad\u0180ilr\u3169\u1023\u316esht;\u697d;\uc000\ud835\udd2f\u0100ao\u3177\u3186r\u0100du\u317d\u317f\xbb\u047b\u0100;l\u1091\u3184;\u696c\u0100;v\u318b\u318c\u43c1;\u43f1\u0180gns\u3195\u31f9\u31fcht\u0300ahlrst\u31a4\u31b0\u31c2\u31d8\u31e4\u31eerrow\u0100;t\u0fdc\u31ada\xe9\u30c8arpoon\u0100du\u31bb\u31bfow\xee\u317ep\xbb\u1092eft\u0100ah\u31ca\u31d0rrow\xf3\u0feaarpoon\xf3\u0551ightarrows;\u61c9quigarro\xf7\u30cbhreetimes;\u62ccg;\u42daingdotse\xf1\u1f32\u0180ahm\u320d\u3210\u3213r\xf2\u0feaa\xf2\u0551;\u600foust\u0100;a\u321e\u321f\u63b1che\xbb\u321fmid;\u6aee\u0200abpt\u3232\u323d\u3240\u3252\u0100nr\u3237\u323ag;\u67edr;\u61fer\xeb\u1003\u0180afl\u3247\u324a\u324er;\u6986;\uc000\ud835\udd63us;\u6a2eimes;\u6a35\u0100ap\u325d\u3267r\u0100;g\u3263\u3264\u4029t;\u6994olint;\u6a12ar\xf2\u31e3\u0200achq\u327b\u3280\u10bc\u3285quo;\u603ar;\uc000\ud835\udcc7\u0100bu\u30fb\u328ao\u0100;r\u0214\u0213\u0180hir\u3297\u329b\u32a0re\xe5\u31f8mes;\u62cai\u0200;efl\u32aa\u1059\u1821\u32ab\u65b9tri;\u69celuhar;\u6968;\u611e\u0d61\u32d5\u32db\u32df\u332c\u3338\u3371\0\u337a\u33a4\0\0\u33ec\u33f0\0\u3428\u3448\u345a\u34ad\u34b1\u34ca\u34f1\0\u3616\0\0\u3633cute;\u415bqu\xef\u27ba\u0500;Eaceinpsy\u11ed\u32f3\u32f5\u32ff\u3302\u330b\u330f\u331f\u3326\u3329;\u6ab4\u01f0\u32fa\0\u32fc;\u6ab8on;\u4161u\xe5\u11fe\u0100;d\u11f3\u3307il;\u415frc;\u415d\u0180Eas\u3316\u3318\u331b;\u6ab6p;\u6abaim;\u62e9olint;\u6a13i\xed\u1204;\u4441ot\u0180;be\u3334\u1d47\u3335\u62c5;\u6a66\u0380Aacmstx\u3346\u334a\u3357\u335b\u335e\u3363\u336drr;\u61d8r\u0100hr\u3350\u3352\xeb\u2228\u0100;o\u0a36\u0a34t\u803b\xa7\u40a7i;\u403bwar;\u6929m\u0100in\u3369\xf0nu\xf3\xf1t;\u6736r\u0100;o\u3376\u2055\uc000\ud835\udd30\u0200acoy\u3382\u3386\u3391\u33a0rp;\u666f\u0100hy\u338b\u338fcy;\u4449;\u4448rt\u026d\u3399\0\0\u339ci\xe4\u1464ara\xec\u2e6f\u803b\xad\u40ad\u0100gm\u33a8\u33b4ma\u0180;fv\u33b1\u33b2\u33b2\u43c3;\u43c2\u0400;deglnpr\u12ab\u33c5\u33c9\u33ce\u33d6\u33de\u33e1\u33e6ot;\u6a6a\u0100;q\u12b1\u12b0\u0100;E\u33d3\u33d4\u6a9e;\u6aa0\u0100;E\u33db\u33dc\u6a9d;\u6a9fe;\u6246lus;\u6a24arr;\u6972ar\xf2\u113d\u0200aeit\u33f8\u3408\u340f\u3417\u0100ls\u33fd\u3404lsetm\xe9\u336ahp;\u6a33parsl;\u69e4\u0100dl\u1463\u3414e;\u6323\u0100;e\u341c\u341d\u6aaa\u0100;s\u3422\u3423\u6aac;\uc000\u2aac\ufe00\u0180flp\u342e\u3433\u3442tcy;\u444c\u0100;b\u3438\u3439\u402f\u0100;a\u343e\u343f\u69c4r;\u633ff;\uc000\ud835\udd64a\u0100dr\u344d\u0402es\u0100;u\u3454\u3455\u6660it\xbb\u3455\u0180csu\u3460\u3479\u349f\u0100au\u3465\u346fp\u0100;s\u1188\u346b;\uc000\u2293\ufe00p\u0100;s\u11b4\u3475;\uc000\u2294\ufe00u\u0100bp\u347f\u348f\u0180;es\u1197\u119c\u3486et\u0100;e\u1197\u348d\xf1\u119d\u0180;es\u11a8\u11ad\u3496et\u0100;e\u11a8\u349d\xf1\u11ae\u0180;af\u117b\u34a6\u05b0r\u0165\u34ab\u05b1\xbb\u117car\xf2\u1148\u0200cemt\u34b9\u34be\u34c2\u34c5r;\uc000\ud835\udcc8tm\xee\xf1i\xec\u3415ar\xe6\u11be\u0100ar\u34ce\u34d5r\u0100;f\u34d4\u17bf\u6606\u0100an\u34da\u34edight\u0100ep\u34e3\u34eapsilo\xee\u1ee0h\xe9\u2eafs\xbb\u2852\u0280bcmnp\u34fb\u355e\u1209\u358b\u358e\u0480;Edemnprs\u350e\u350f\u3511\u3515\u351e\u3523\u352c\u3531\u3536\u6282;\u6ac5ot;\u6abd\u0100;d\u11da\u351aot;\u6ac3ult;\u6ac1\u0100Ee\u3528\u352a;\u6acb;\u628alus;\u6abfarr;\u6979\u0180eiu\u353d\u3552\u3555t\u0180;en\u350e\u3545\u354bq\u0100;q\u11da\u350feq\u0100;q\u352b\u3528m;\u6ac7\u0100bp\u355a\u355c;\u6ad5;\u6ad3c\u0300;acens\u11ed\u356c\u3572\u3579\u357b\u3326ppro\xf8\u32faurlye\xf1\u11fe\xf1\u11f3\u0180aes\u3582\u3588\u331bppro\xf8\u331aq\xf1\u3317g;\u666a\u0680123;Edehlmnps\u35a9\u35ac\u35af\u121c\u35b2\u35b4\u35c0\u35c9\u35d5\u35da\u35df\u35e8\u35ed\u803b\xb9\u40b9\u803b\xb2\u40b2\u803b\xb3\u40b3;\u6ac6\u0100os\u35b9\u35bct;\u6abeub;\u6ad8\u0100;d\u1222\u35c5ot;\u6ac4s\u0100ou\u35cf\u35d2l;\u67c9b;\u6ad7arr;\u697bult;\u6ac2\u0100Ee\u35e4\u35e6;\u6acc;\u628blus;\u6ac0\u0180eiu\u35f4\u3609\u360ct\u0180;en\u121c\u35fc\u3602q\u0100;q\u1222\u35b2eq\u0100;q\u35e7\u35e4m;\u6ac8\u0100bp\u3611\u3613;\u6ad4;\u6ad6\u0180Aan\u361c\u3620\u362drr;\u61d9r\u0100hr\u3626\u3628\xeb\u222e\u0100;o\u0a2b\u0a29war;\u692alig\u803b\xdf\u40df\u0be1\u3651\u365d\u3660\u12ce\u3673\u3679\0\u367e\u36c2\0\0\0\0\0\u36db\u3703\0\u3709\u376c\0\0\0\u3787\u0272\u3656\0\0\u365bget;\u6316;\u43c4r\xeb\u0e5f\u0180aey\u3666\u366b\u3670ron;\u4165dil;\u4163;\u4442lrec;\u6315r;\uc000\ud835\udd31\u0200eiko\u3686\u369d\u36b5\u36bc\u01f2\u368b\0\u3691e\u01004f\u1284\u1281a\u0180;sv\u3698\u3699\u369b\u43b8ym;\u43d1\u0100cn\u36a2\u36b2k\u0100as\u36a8\u36aeppro\xf8\u12c1im\xbb\u12acs\xf0\u129e\u0100as\u36ba\u36ae\xf0\u12c1rn\u803b\xfe\u40fe\u01ec\u031f\u36c6\u22e7es\u8180\xd7;bd\u36cf\u36d0\u36d8\u40d7\u0100;a\u190f\u36d5r;\u6a31;\u6a30\u0180eps\u36e1\u36e3\u3700\xe1\u2a4d\u0200;bcf\u0486\u36ec\u36f0\u36f4ot;\u6336ir;\u6af1\u0100;o\u36f9\u36fc\uc000\ud835\udd65rk;\u6ada\xe1\u3362rime;\u6034\u0180aip\u370f\u3712\u3764d\xe5\u1248\u0380adempst\u3721\u374d\u3740\u3751\u3757\u375c\u375fngle\u0280;dlqr\u3730\u3731\u3736\u3740\u3742\u65b5own\xbb\u1dbbeft\u0100;e\u2800\u373e\xf1\u092e;\u625cight\u0100;e\u32aa\u374b\xf1\u105aot;\u65ecinus;\u6a3alus;\u6a39b;\u69cdime;\u6a3bezium;\u63e2\u0180cht\u3772\u377d\u3781\u0100ry\u3777\u377b;\uc000\ud835\udcc9;\u4446cy;\u445brok;\u4167\u0100io\u378b\u378ex\xf4\u1777head\u0100lr\u3797\u37a0eftarro\xf7\u084fightarrow\xbb\u0f5d\u0900AHabcdfghlmoprstuw\u37d0\u37d3\u37d7\u37e4\u37f0\u37fc\u380e\u381c\u3823\u3834\u3851\u385d\u386b\u38a9\u38cc\u38d2\u38ea\u38f6r\xf2\u03edar;\u6963\u0100cr\u37dc\u37e2ute\u803b\xfa\u40fa\xf2\u1150r\u01e3\u37ea\0\u37edy;\u445eve;\u416d\u0100iy\u37f5\u37farc\u803b\xfb\u40fb;\u4443\u0180abh\u3803\u3806\u380br\xf2\u13adlac;\u4171a\xf2\u13c3\u0100ir\u3813\u3818sht;\u697e;\uc000\ud835\udd32rave\u803b\xf9\u40f9\u0161\u3827\u3831r\u0100lr\u382c\u382e\xbb\u0957\xbb\u1083lk;\u6580\u0100ct\u3839\u384d\u026f\u383f\0\0\u384arn\u0100;e\u3845\u3846\u631cr\xbb\u3846op;\u630fri;\u65f8\u0100al\u3856\u385acr;\u416b\u80bb\xa8\u0349\u0100gp\u3862\u3866on;\u4173f;\uc000\ud835\udd66\u0300adhlsu\u114b\u3878\u387d\u1372\u3891\u38a0own\xe1\u13b3arpoon\u0100lr\u3888\u388cef\xf4\u382digh\xf4\u382fi\u0180;hl\u3899\u389a\u389c\u43c5\xbb\u13faon\xbb\u389aparrows;\u61c8\u0180cit\u38b0\u38c4\u38c8\u026f\u38b6\0\0\u38c1rn\u0100;e\u38bc\u38bd\u631dr\xbb\u38bdop;\u630eng;\u416fri;\u65f9cr;\uc000\ud835\udcca\u0180dir\u38d9\u38dd\u38e2ot;\u62f0lde;\u4169i\u0100;f\u3730\u38e8\xbb\u1813\u0100am\u38ef\u38f2r\xf2\u38a8l\u803b\xfc\u40fcangle;\u69a7\u0780ABDacdeflnoprsz\u391c\u391f\u3929\u392d\u39b5\u39b8\u39bd\u39df\u39e4\u39e8\u39f3\u39f9\u39fd\u3a01\u3a20r\xf2\u03f7ar\u0100;v\u3926\u3927\u6ae8;\u6ae9as\xe8\u03e1\u0100nr\u3932\u3937grt;\u699c\u0380eknprst\u34e3\u3946\u394b\u3952\u395d\u3964\u3996app\xe1\u2415othin\xe7\u1e96\u0180hir\u34eb\u2ec8\u3959op\xf4\u2fb5\u0100;h\u13b7\u3962\xef\u318d\u0100iu\u3969\u396dgm\xe1\u33b3\u0100bp\u3972\u3984setneq\u0100;q\u397d\u3980\uc000\u228a\ufe00;\uc000\u2acb\ufe00setneq\u0100;q\u398f\u3992\uc000\u228b\ufe00;\uc000\u2acc\ufe00\u0100hr\u399b\u399fet\xe1\u369ciangle\u0100lr\u39aa\u39afeft\xbb\u0925ight\xbb\u1051y;\u4432ash\xbb\u1036\u0180elr\u39c4\u39d2\u39d7\u0180;be\u2dea\u39cb\u39cfar;\u62bbq;\u625alip;\u62ee\u0100bt\u39dc\u1468a\xf2\u1469r;\uc000\ud835\udd33tr\xe9\u39aesu\u0100bp\u39ef\u39f1\xbb\u0d1c\xbb\u0d59pf;\uc000\ud835\udd67ro\xf0\u0efbtr\xe9\u39b4\u0100cu\u3a06\u3a0br;\uc000\ud835\udccb\u0100bp\u3a10\u3a18n\u0100Ee\u3980\u3a16\xbb\u397en\u0100Ee\u3992\u3a1e\xbb\u3990igzag;\u699a\u0380cefoprs\u3a36\u3a3b\u3a56\u3a5b\u3a54\u3a61\u3a6airc;\u4175\u0100di\u3a40\u3a51\u0100bg\u3a45\u3a49ar;\u6a5fe\u0100;q\u15fa\u3a4f;\u6259erp;\u6118r;\uc000\ud835\udd34pf;\uc000\ud835\udd68\u0100;e\u1479\u3a66at\xe8\u1479cr;\uc000\ud835\udccc\u0ae3\u178e\u3a87\0\u3a8b\0\u3a90\u3a9b\0\0\u3a9d\u3aa8\u3aab\u3aaf\0\0\u3ac3\u3ace\0\u3ad8\u17dc\u17dftr\xe9\u17d1r;\uc000\ud835\udd35\u0100Aa\u3a94\u3a97r\xf2\u03c3r\xf2\u09f6;\u43be\u0100Aa\u3aa1\u3aa4r\xf2\u03b8r\xf2\u09eba\xf0\u2713is;\u62fb\u0180dpt\u17a4\u3ab5\u3abe\u0100fl\u3aba\u17a9;\uc000\ud835\udd69im\xe5\u17b2\u0100Aa\u3ac7\u3acar\xf2\u03cer\xf2\u0a01\u0100cq\u3ad2\u17b8r;\uc000\ud835\udccd\u0100pt\u17d6\u3adcr\xe9\u17d4\u0400acefiosu\u3af0\u3afd\u3b08\u3b0c\u3b11\u3b15\u3b1b\u3b21c\u0100uy\u3af6\u3afbte\u803b\xfd\u40fd;\u444f\u0100iy\u3b02\u3b06rc;\u4177;\u444bn\u803b\xa5\u40a5r;\uc000\ud835\udd36cy;\u4457pf;\uc000\ud835\udd6acr;\uc000\ud835\udcce\u0100cm\u3b26\u3b29y;\u444el\u803b\xff\u40ff\u0500acdefhiosw\u3b42\u3b48\u3b54\u3b58\u3b64\u3b69\u3b6d\u3b74\u3b7a\u3b80cute;\u417a\u0100ay\u3b4d\u3b52ron;\u417e;\u4437ot;\u417c\u0100et\u3b5d\u3b61tr\xe6\u155fa;\u43b6r;\uc000\ud835\udd37cy;\u4436grarr;\u61ddpf;\uc000\ud835\udd6bcr;\uc000\ud835\udccf\u0100jn\u3b85\u3b87;\u600dj;\u600c"
    .split("")
    .map((c) => c.charCodeAt(0)));

// Generated using scripts/write-decode-map.ts
var xmlDecodeTree$1 = new Uint16Array(
// prettier-ignore
"\u0200aglq\t\x15\x18\x1b\u026d\x0f\0\0\x12p;\u4026os;\u4027t;\u403et;\u403cuot;\u4022"
    .split("")
    .map((c) => c.charCodeAt(0)));

// Adapted from https://github.com/mathiasbynens/he/blob/36afe179392226cf1b6ccdb16ebbb7a5a844d93a/src/he.js#L106-L134
var _a$2;
const decodeMap$2 = new Map([
    [0, 65533],
    // C1 Unicode control character reference replacements
    [128, 8364],
    [130, 8218],
    [131, 402],
    [132, 8222],
    [133, 8230],
    [134, 8224],
    [135, 8225],
    [136, 710],
    [137, 8240],
    [138, 352],
    [139, 8249],
    [140, 338],
    [142, 381],
    [145, 8216],
    [146, 8217],
    [147, 8220],
    [148, 8221],
    [149, 8226],
    [150, 8211],
    [151, 8212],
    [152, 732],
    [153, 8482],
    [154, 353],
    [155, 8250],
    [156, 339],
    [158, 382],
    [159, 376],
]);
/**
 * Polyfill for `String.fromCodePoint`. It is used to create a string from a Unicode code point.
 */
const fromCodePoint$1 = 
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, node/no-unsupported-features/es-builtins
(_a$2 = String.fromCodePoint) !== null && _a$2 !== void 0 ? _a$2 : function (codePoint) {
    let output = "";
    if (codePoint > 0xffff) {
        codePoint -= 0x10000;
        output += String.fromCharCode(((codePoint >>> 10) & 0x3ff) | 0xd800);
        codePoint = 0xdc00 | (codePoint & 0x3ff);
    }
    output += String.fromCharCode(codePoint);
    return output;
};
/**
 * Replace the given code point with a replacement character if it is a
 * surrogate or is outside the valid range. Otherwise return the code
 * point unchanged.
 */
function replaceCodePoint$2(codePoint) {
    var _a;
    if ((codePoint >= 0xd800 && codePoint <= 0xdfff) || codePoint > 0x10ffff) {
        return 0xfffd;
    }
    return (_a = decodeMap$2.get(codePoint)) !== null && _a !== void 0 ? _a : codePoint;
}

var CharCodes$3;
(function (CharCodes) {
    CharCodes[CharCodes["NUM"] = 35] = "NUM";
    CharCodes[CharCodes["SEMI"] = 59] = "SEMI";
    CharCodes[CharCodes["EQUALS"] = 61] = "EQUALS";
    CharCodes[CharCodes["ZERO"] = 48] = "ZERO";
    CharCodes[CharCodes["NINE"] = 57] = "NINE";
    CharCodes[CharCodes["LOWER_A"] = 97] = "LOWER_A";
    CharCodes[CharCodes["LOWER_F"] = 102] = "LOWER_F";
    CharCodes[CharCodes["LOWER_X"] = 120] = "LOWER_X";
    CharCodes[CharCodes["LOWER_Z"] = 122] = "LOWER_Z";
    CharCodes[CharCodes["UPPER_A"] = 65] = "UPPER_A";
    CharCodes[CharCodes["UPPER_F"] = 70] = "UPPER_F";
    CharCodes[CharCodes["UPPER_Z"] = 90] = "UPPER_Z";
})(CharCodes$3 || (CharCodes$3 = {}));
/** Bit that needs to be set to convert an upper case ASCII character to lower case */
const TO_LOWER_BIT$2 = 0b100000;
var BinTrieFlags$2;
(function (BinTrieFlags) {
    BinTrieFlags[BinTrieFlags["VALUE_LENGTH"] = 49152] = "VALUE_LENGTH";
    BinTrieFlags[BinTrieFlags["BRANCH_LENGTH"] = 16256] = "BRANCH_LENGTH";
    BinTrieFlags[BinTrieFlags["JUMP_TABLE"] = 127] = "JUMP_TABLE";
})(BinTrieFlags$2 || (BinTrieFlags$2 = {}));
function isNumber$2(code) {
    return code >= CharCodes$3.ZERO && code <= CharCodes$3.NINE;
}
function isHexadecimalCharacter$2(code) {
    return ((code >= CharCodes$3.UPPER_A && code <= CharCodes$3.UPPER_F) ||
        (code >= CharCodes$3.LOWER_A && code <= CharCodes$3.LOWER_F));
}
function isAsciiAlphaNumeric$3(code) {
    return ((code >= CharCodes$3.UPPER_A && code <= CharCodes$3.UPPER_Z) ||
        (code >= CharCodes$3.LOWER_A && code <= CharCodes$3.LOWER_Z) ||
        isNumber$2(code));
}
/**
 * Checks if the given character is a valid end character for an entity in an attribute.
 *
 * Attribute values that aren't terminated properly aren't parsed, and shouldn't lead to a parser error.
 * See the example in https://html.spec.whatwg.org/multipage/parsing.html#named-character-reference-state
 */
function isEntityInAttributeInvalidEnd$2(code) {
    return code === CharCodes$3.EQUALS || isAsciiAlphaNumeric$3(code);
}
var EntityDecoderState$2;
(function (EntityDecoderState) {
    EntityDecoderState[EntityDecoderState["EntityStart"] = 0] = "EntityStart";
    EntityDecoderState[EntityDecoderState["NumericStart"] = 1] = "NumericStart";
    EntityDecoderState[EntityDecoderState["NumericDecimal"] = 2] = "NumericDecimal";
    EntityDecoderState[EntityDecoderState["NumericHex"] = 3] = "NumericHex";
    EntityDecoderState[EntityDecoderState["NamedEntity"] = 4] = "NamedEntity";
})(EntityDecoderState$2 || (EntityDecoderState$2 = {}));
var DecodingMode$2;
(function (DecodingMode) {
    /** Entities in text nodes that can end with any character. */
    DecodingMode[DecodingMode["Legacy"] = 0] = "Legacy";
    /** Only allow entities terminated with a semicolon. */
    DecodingMode[DecodingMode["Strict"] = 1] = "Strict";
    /** Entities in attributes have limitations on ending characters. */
    DecodingMode[DecodingMode["Attribute"] = 2] = "Attribute";
})(DecodingMode$2 || (DecodingMode$2 = {}));
/**
 * Token decoder with support of writing partial entities.
 */
class EntityDecoder$2 {
    constructor(
    /** The tree used to decode entities. */
    decodeTree, 
    /**
     * The function that is called when a codepoint is decoded.
     *
     * For multi-byte named entities, this will be called multiple times,
     * with the second codepoint, and the same `consumed` value.
     *
     * @param codepoint The decoded codepoint.
     * @param consumed The number of bytes consumed by the decoder.
     */
    emitCodePoint, 
    /** An object that is used to produce errors. */
    errors) {
        this.decodeTree = decodeTree;
        this.emitCodePoint = emitCodePoint;
        this.errors = errors;
        /** The current state of the decoder. */
        this.state = EntityDecoderState$2.EntityStart;
        /** Characters that were consumed while parsing an entity. */
        this.consumed = 1;
        /**
         * The result of the entity.
         *
         * Either the result index of a numeric entity, or the codepoint of a
         * numeric entity.
         */
        this.result = 0;
        /** The current index in the decode tree. */
        this.treeIndex = 0;
        /** The number of characters that were consumed in excess. */
        this.excess = 1;
        /** The mode in which the decoder is operating. */
        this.decodeMode = DecodingMode$2.Strict;
    }
    /** Resets the instance to make it reusable. */
    startEntity(decodeMode) {
        this.decodeMode = decodeMode;
        this.state = EntityDecoderState$2.EntityStart;
        this.result = 0;
        this.treeIndex = 0;
        this.excess = 1;
        this.consumed = 1;
    }
    /**
     * Write an entity to the decoder. This can be called multiple times with partial entities.
     * If the entity is incomplete, the decoder will return -1.
     *
     * Mirrors the implementation of `getDecoder`, but with the ability to stop decoding if the
     * entity is incomplete, and resume when the next string is written.
     *
     * @param string The string containing the entity (or a continuation of the entity).
     * @param offset The offset at which the entity begins. Should be 0 if this is not the first call.
     * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
     */
    write(str, offset) {
        switch (this.state) {
            case EntityDecoderState$2.EntityStart: {
                if (str.charCodeAt(offset) === CharCodes$3.NUM) {
                    this.state = EntityDecoderState$2.NumericStart;
                    this.consumed += 1;
                    return this.stateNumericStart(str, offset + 1);
                }
                this.state = EntityDecoderState$2.NamedEntity;
                return this.stateNamedEntity(str, offset);
            }
            case EntityDecoderState$2.NumericStart: {
                return this.stateNumericStart(str, offset);
            }
            case EntityDecoderState$2.NumericDecimal: {
                return this.stateNumericDecimal(str, offset);
            }
            case EntityDecoderState$2.NumericHex: {
                return this.stateNumericHex(str, offset);
            }
            case EntityDecoderState$2.NamedEntity: {
                return this.stateNamedEntity(str, offset);
            }
        }
    }
    /**
     * Switches between the numeric decimal and hexadecimal states.
     *
     * Equivalent to the `Numeric character reference state` in the HTML spec.
     *
     * @param str The string containing the entity (or a continuation of the entity).
     * @param offset The current offset.
     * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
     */
    stateNumericStart(str, offset) {
        if (offset >= str.length) {
            return -1;
        }
        if ((str.charCodeAt(offset) | TO_LOWER_BIT$2) === CharCodes$3.LOWER_X) {
            this.state = EntityDecoderState$2.NumericHex;
            this.consumed += 1;
            return this.stateNumericHex(str, offset + 1);
        }
        this.state = EntityDecoderState$2.NumericDecimal;
        return this.stateNumericDecimal(str, offset);
    }
    addToNumericResult(str, start, end, base) {
        if (start !== end) {
            const digitCount = end - start;
            this.result =
                this.result * Math.pow(base, digitCount) +
                    parseInt(str.substr(start, digitCount), base);
            this.consumed += digitCount;
        }
    }
    /**
     * Parses a hexadecimal numeric entity.
     *
     * Equivalent to the `Hexademical character reference state` in the HTML spec.
     *
     * @param str The string containing the entity (or a continuation of the entity).
     * @param offset The current offset.
     * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
     */
    stateNumericHex(str, offset) {
        const startIdx = offset;
        while (offset < str.length) {
            const char = str.charCodeAt(offset);
            if (isNumber$2(char) || isHexadecimalCharacter$2(char)) {
                offset += 1;
            }
            else {
                this.addToNumericResult(str, startIdx, offset, 16);
                return this.emitNumericEntity(char, 3);
            }
        }
        this.addToNumericResult(str, startIdx, offset, 16);
        return -1;
    }
    /**
     * Parses a decimal numeric entity.
     *
     * Equivalent to the `Decimal character reference state` in the HTML spec.
     *
     * @param str The string containing the entity (or a continuation of the entity).
     * @param offset The current offset.
     * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
     */
    stateNumericDecimal(str, offset) {
        const startIdx = offset;
        while (offset < str.length) {
            const char = str.charCodeAt(offset);
            if (isNumber$2(char)) {
                offset += 1;
            }
            else {
                this.addToNumericResult(str, startIdx, offset, 10);
                return this.emitNumericEntity(char, 2);
            }
        }
        this.addToNumericResult(str, startIdx, offset, 10);
        return -1;
    }
    /**
     * Validate and emit a numeric entity.
     *
     * Implements the logic from the `Hexademical character reference start
     * state` and `Numeric character reference end state` in the HTML spec.
     *
     * @param lastCp The last code point of the entity. Used to see if the
     *               entity was terminated with a semicolon.
     * @param expectedLength The minimum number of characters that should be
     *                       consumed. Used to validate that at least one digit
     *                       was consumed.
     * @returns The number of characters that were consumed.
     */
    emitNumericEntity(lastCp, expectedLength) {
        var _a;
        // Ensure we consumed at least one digit.
        if (this.consumed <= expectedLength) {
            (_a = this.errors) === null || _a === void 0 ? void 0 : _a.absenceOfDigitsInNumericCharacterReference(this.consumed);
            return 0;
        }
        // Figure out if this is a legit end of the entity
        if (lastCp === CharCodes$3.SEMI) {
            this.consumed += 1;
        }
        else if (this.decodeMode === DecodingMode$2.Strict) {
            return 0;
        }
        this.emitCodePoint(replaceCodePoint$2(this.result), this.consumed);
        if (this.errors) {
            if (lastCp !== CharCodes$3.SEMI) {
                this.errors.missingSemicolonAfterCharacterReference();
            }
            this.errors.validateNumericCharacterReference(this.result);
        }
        return this.consumed;
    }
    /**
     * Parses a named entity.
     *
     * Equivalent to the `Named character reference state` in the HTML spec.
     *
     * @param str The string containing the entity (or a continuation of the entity).
     * @param offset The current offset.
     * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
     */
    stateNamedEntity(str, offset) {
        const { decodeTree } = this;
        let current = decodeTree[this.treeIndex];
        // The mask is the number of bytes of the value, including the current byte.
        let valueLength = (current & BinTrieFlags$2.VALUE_LENGTH) >> 14;
        for (; offset < str.length; offset++, this.excess++) {
            const char = str.charCodeAt(offset);
            this.treeIndex = determineBranch$2(decodeTree, current, this.treeIndex + Math.max(1, valueLength), char);
            if (this.treeIndex < 0) {
                return this.result === 0 ||
                    // If we are parsing an attribute
                    (this.decodeMode === DecodingMode$2.Attribute &&
                        // We shouldn't have consumed any characters after the entity,
                        (valueLength === 0 ||
                            // And there should be no invalid characters.
                            isEntityInAttributeInvalidEnd$2(char)))
                    ? 0
                    : this.emitNotTerminatedNamedEntity();
            }
            current = decodeTree[this.treeIndex];
            valueLength = (current & BinTrieFlags$2.VALUE_LENGTH) >> 14;
            // If the branch is a value, store it and continue
            if (valueLength !== 0) {
                // If the entity is terminated by a semicolon, we are done.
                if (char === CharCodes$3.SEMI) {
                    return this.emitNamedEntityData(this.treeIndex, valueLength, this.consumed + this.excess);
                }
                // If we encounter a non-terminated (legacy) entity while parsing strictly, then ignore it.
                if (this.decodeMode !== DecodingMode$2.Strict) {
                    this.result = this.treeIndex;
                    this.consumed += this.excess;
                    this.excess = 0;
                }
            }
        }
        return -1;
    }
    /**
     * Emit a named entity that was not terminated with a semicolon.
     *
     * @returns The number of characters consumed.
     */
    emitNotTerminatedNamedEntity() {
        var _a;
        const { result, decodeTree } = this;
        const valueLength = (decodeTree[result] & BinTrieFlags$2.VALUE_LENGTH) >> 14;
        this.emitNamedEntityData(result, valueLength, this.consumed);
        (_a = this.errors) === null || _a === void 0 ? void 0 : _a.missingSemicolonAfterCharacterReference();
        return this.consumed;
    }
    /**
     * Emit a named entity.
     *
     * @param result The index of the entity in the decode tree.
     * @param valueLength The number of bytes in the entity.
     * @param consumed The number of characters consumed.
     *
     * @returns The number of characters consumed.
     */
    emitNamedEntityData(result, valueLength, consumed) {
        const { decodeTree } = this;
        this.emitCodePoint(valueLength === 1
            ? decodeTree[result] & ~BinTrieFlags$2.VALUE_LENGTH
            : decodeTree[result + 1], consumed);
        if (valueLength === 3) {
            // For multi-byte values, we need to emit the second byte.
            this.emitCodePoint(decodeTree[result + 2], consumed);
        }
        return consumed;
    }
    /**
     * Signal to the parser that the end of the input was reached.
     *
     * Remaining data will be emitted and relevant errors will be produced.
     *
     * @returns The number of characters consumed.
     */
    end() {
        var _a;
        switch (this.state) {
            case EntityDecoderState$2.NamedEntity: {
                // Emit a named entity if we have one.
                return this.result !== 0 &&
                    (this.decodeMode !== DecodingMode$2.Attribute ||
                        this.result === this.treeIndex)
                    ? this.emitNotTerminatedNamedEntity()
                    : 0;
            }
            // Otherwise, emit a numeric entity if we have one.
            case EntityDecoderState$2.NumericDecimal: {
                return this.emitNumericEntity(0, 2);
            }
            case EntityDecoderState$2.NumericHex: {
                return this.emitNumericEntity(0, 3);
            }
            case EntityDecoderState$2.NumericStart: {
                (_a = this.errors) === null || _a === void 0 ? void 0 : _a.absenceOfDigitsInNumericCharacterReference(this.consumed);
                return 0;
            }
            case EntityDecoderState$2.EntityStart: {
                // Return 0 if we have no entity.
                return 0;
            }
        }
    }
}
/**
 * Creates a function that decodes entities in a string.
 *
 * @param decodeTree The decode tree.
 * @returns A function that decodes entities in a string.
 */
function getDecoder(decodeTree) {
    let ret = "";
    const decoder = new EntityDecoder$2(decodeTree, (str) => (ret += fromCodePoint$1(str)));
    return function decodeWithTrie(str, decodeMode) {
        let lastIndex = 0;
        let offset = 0;
        while ((offset = str.indexOf("&", offset)) >= 0) {
            ret += str.slice(lastIndex, offset);
            decoder.startEntity(decodeMode);
            const len = decoder.write(str, 
            // Skip the "&"
            offset + 1);
            if (len < 0) {
                lastIndex = offset + decoder.end();
                break;
            }
            lastIndex = offset + len;
            // If `len` is 0, skip the current `&` and continue.
            offset = len === 0 ? lastIndex + 1 : lastIndex;
        }
        const result = ret + str.slice(lastIndex);
        // Make sure we don't keep a reference to the final string.
        ret = "";
        return result;
    };
}
/**
 * Determines the branch of the current node that is taken given the current
 * character. This function is used to traverse the trie.
 *
 * @param decodeTree The trie.
 * @param current The current node.
 * @param nodeIdx The index right after the current node and its value.
 * @param char The current character.
 * @returns The index of the next node, or -1 if no branch is taken.
 */
function determineBranch$2(decodeTree, current, nodeIdx, char) {
    const branchCount = (current & BinTrieFlags$2.BRANCH_LENGTH) >> 7;
    const jumpOffset = current & BinTrieFlags$2.JUMP_TABLE;
    // Case 1: Single branch encoded in jump offset
    if (branchCount === 0) {
        return jumpOffset !== 0 && char === jumpOffset ? nodeIdx : -1;
    }
    // Case 2: Multiple branches encoded in jump table
    if (jumpOffset) {
        const value = char - jumpOffset;
        return value < 0 || value >= branchCount
            ? -1
            : decodeTree[nodeIdx + value] - 1;
    }
    // Case 3: Multiple branches encoded in dictionary
    // Binary search for the character.
    let lo = nodeIdx;
    let hi = lo + branchCount - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        const midVal = decodeTree[mid];
        if (midVal < char) {
            lo = mid + 1;
        }
        else if (midVal > char) {
            hi = mid - 1;
        }
        else {
            return decodeTree[mid + branchCount];
        }
    }
    return -1;
}
getDecoder(htmlDecodeTree$2);
getDecoder(xmlDecodeTree$1);

const xmlReplacer = /["&'<>$\x80-\uFFFF]/g;
const xmlCodeMap = new Map([
    [34, "&quot;"],
    [38, "&amp;"],
    [39, "&apos;"],
    [60, "&lt;"],
    [62, "&gt;"],
]);
// For compatibility with node < 4, we wrap `codePointAt`
const getCodePoint = 
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
String.prototype.codePointAt != null
    ? (str, index) => str.codePointAt(index)
    : // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        (c, index) => (c.charCodeAt(index) & 0xfc00) === 0xd800
            ? (c.charCodeAt(index) - 0xd800) * 0x400 +
                c.charCodeAt(index + 1) -
                0xdc00 +
                0x10000
            : c.charCodeAt(index);
/**
 * Encodes all non-ASCII characters, as well as characters not valid in XML
 * documents using XML entities.
 *
 * If a character has no equivalent entity, a
 * numeric hexadecimal reference (eg. `&#xfc;`) will be used.
 */
function encodeXML(str) {
    let ret = "";
    let lastIdx = 0;
    let match;
    while ((match = xmlReplacer.exec(str)) !== null) {
        const i = match.index;
        const char = str.charCodeAt(i);
        const next = xmlCodeMap.get(char);
        if (next !== undefined) {
            ret += str.substring(lastIdx, i) + next;
            lastIdx = i + 1;
        }
        else {
            ret += `${str.substring(lastIdx, i)}&#x${getCodePoint(str, i).toString(16)};`;
            // Increase by 1 if we have a surrogate pair
            lastIdx = xmlReplacer.lastIndex += Number((char & 0xfc00) === 0xd800);
        }
    }
    return ret + str.substr(lastIdx);
}
/**
 * Creates a function that escapes all characters matched by the given regular
 * expression using the given map of characters to escape to their entities.
 *
 * @param regex Regular expression to match characters to escape.
 * @param map Map of characters to escape to their entities.
 *
 * @returns Function that escapes all characters matched by the given regular
 * expression using the given map of characters to escape to their entities.
 */
function getEscaper$1(regex, map) {
    return function escape(data) {
        let match;
        let lastIdx = 0;
        let result = "";
        while ((match = regex.exec(data))) {
            if (lastIdx !== match.index) {
                result += data.substring(lastIdx, match.index);
            }
            // We know that this character will be in the map.
            result += map.get(match[0].charCodeAt(0));
            // Every match will be of length 1
            lastIdx = match.index + 1;
        }
        return result + data.substring(lastIdx);
    };
}
/**
 * Encodes all characters that have to be escaped in HTML attributes,
 * following {@link https://html.spec.whatwg.org/multipage/parsing.html#escapingString}.
 *
 * @param data String to escape.
 */
const escapeAttribute$1 = getEscaper$1(/["&\u00A0]/g, new Map([
    [34, "&quot;"],
    [38, "&amp;"],
    [160, "&nbsp;"],
]));
/**
 * Encodes all characters that have to be escaped in HTML text,
 * following {@link https://html.spec.whatwg.org/multipage/parsing.html#escapingString}.
 *
 * @param data String to escape.
 */
const escapeText$1 = getEscaper$1(/[&<>\u00A0]/g, new Map([
    [38, "&amp;"],
    [60, "&lt;"],
    [62, "&gt;"],
    [160, "&nbsp;"],
]));

/** The level of entities to support. */
var EntityLevel;
(function (EntityLevel) {
    /** Support only XML entities. */
    EntityLevel[EntityLevel["XML"] = 0] = "XML";
    /** Support HTML entities, which are a superset of XML entities. */
    EntityLevel[EntityLevel["HTML"] = 1] = "HTML";
})(EntityLevel || (EntityLevel = {}));
var EncodingMode;
(function (EncodingMode) {
    /**
     * The output is UTF-8 encoded. Only characters that need escaping within
     * XML will be escaped.
     */
    EncodingMode[EncodingMode["UTF8"] = 0] = "UTF8";
    /**
     * The output consists only of ASCII characters. Characters that need
     * escaping within HTML, and characters that aren't ASCII characters will
     * be escaped.
     */
    EncodingMode[EncodingMode["ASCII"] = 1] = "ASCII";
    /**
     * Encode all characters that have an equivalent entity, as well as all
     * characters that are not ASCII characters.
     */
    EncodingMode[EncodingMode["Extensive"] = 2] = "Extensive";
    /**
     * Encode all characters that have to be escaped in HTML attributes,
     * following {@link https://html.spec.whatwg.org/multipage/parsing.html#escapingString}.
     */
    EncodingMode[EncodingMode["Attribute"] = 3] = "Attribute";
    /**
     * Encode all characters that have to be escaped in HTML text,
     * following {@link https://html.spec.whatwg.org/multipage/parsing.html#escapingString}.
     */
    EncodingMode[EncodingMode["Text"] = 4] = "Text";
})(EncodingMode || (EncodingMode = {}));

const elementNames = new Map([
    "altGlyph",
    "altGlyphDef",
    "altGlyphItem",
    "animateColor",
    "animateMotion",
    "animateTransform",
    "clipPath",
    "feBlend",
    "feColorMatrix",
    "feComponentTransfer",
    "feComposite",
    "feConvolveMatrix",
    "feDiffuseLighting",
    "feDisplacementMap",
    "feDistantLight",
    "feDropShadow",
    "feFlood",
    "feFuncA",
    "feFuncB",
    "feFuncG",
    "feFuncR",
    "feGaussianBlur",
    "feImage",
    "feMerge",
    "feMergeNode",
    "feMorphology",
    "feOffset",
    "fePointLight",
    "feSpecularLighting",
    "feSpotLight",
    "feTile",
    "feTurbulence",
    "foreignObject",
    "glyphRef",
    "linearGradient",
    "radialGradient",
    "textPath",
].map((val) => [val.toLowerCase(), val]));
const attributeNames = new Map([
    "definitionURL",
    "attributeName",
    "attributeType",
    "baseFrequency",
    "baseProfile",
    "calcMode",
    "clipPathUnits",
    "diffuseConstant",
    "edgeMode",
    "filterUnits",
    "glyphRef",
    "gradientTransform",
    "gradientUnits",
    "kernelMatrix",
    "kernelUnitLength",
    "keyPoints",
    "keySplines",
    "keyTimes",
    "lengthAdjust",
    "limitingConeAngle",
    "markerHeight",
    "markerUnits",
    "markerWidth",
    "maskContentUnits",
    "maskUnits",
    "numOctaves",
    "pathLength",
    "patternContentUnits",
    "patternTransform",
    "patternUnits",
    "pointsAtX",
    "pointsAtY",
    "pointsAtZ",
    "preserveAlpha",
    "preserveAspectRatio",
    "primitiveUnits",
    "refX",
    "refY",
    "repeatCount",
    "repeatDur",
    "requiredExtensions",
    "requiredFeatures",
    "specularConstant",
    "specularExponent",
    "spreadMethod",
    "startOffset",
    "stdDeviation",
    "stitchTiles",
    "surfaceScale",
    "systemLanguage",
    "tableValues",
    "targetX",
    "targetY",
    "textLength",
    "viewBox",
    "viewTarget",
    "xChannelSelector",
    "yChannelSelector",
    "zoomAndPan",
].map((val) => [val.toLowerCase(), val]));

/*
 * Module dependencies
 */
const unencodedElements = new Set([
    "style",
    "script",
    "xmp",
    "iframe",
    "noembed",
    "noframes",
    "plaintext",
    "noscript",
]);
function replaceQuotes(value) {
    return value.replace(/"/g, "&quot;");
}
/**
 * Format attributes
 */
function formatAttributes(attributes, opts) {
    var _a;
    if (!attributes)
        return;
    const encode = ((_a = opts.encodeEntities) !== null && _a !== void 0 ? _a : opts.decodeEntities) === false
        ? replaceQuotes
        : opts.xmlMode || opts.encodeEntities !== "utf8"
            ? encodeXML
            : escapeAttribute$1;
    return Object.keys(attributes)
        .map((key) => {
        var _a, _b;
        const value = (_a = attributes[key]) !== null && _a !== void 0 ? _a : "";
        if (opts.xmlMode === "foreign") {
            /* Fix up mixed-case attribute names */
            key = (_b = attributeNames.get(key)) !== null && _b !== void 0 ? _b : key;
        }
        if (!opts.emptyAttrs && !opts.xmlMode && value === "") {
            return key;
        }
        return `${key}="${encode(value)}"`;
    })
        .join(" ");
}
/**
 * Self-enclosing tags
 */
const singleTag = new Set([
    "area",
    "base",
    "basefont",
    "br",
    "col",
    "command",
    "embed",
    "frame",
    "hr",
    "img",
    "input",
    "isindex",
    "keygen",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
]);
/**
 * Renders a DOM node or an array of DOM nodes to a string.
 *
 * Can be thought of as the equivalent of the `outerHTML` of the passed node(s).
 *
 * @param node Node to be rendered.
 * @param options Changes serialization behavior
 */
function render$1(node, options = {}) {
    const nodes = "length" in node ? node : [node];
    let output = "";
    for (let i = 0; i < nodes.length; i++) {
        output += renderNode(nodes[i], options);
    }
    return output;
}
function renderNode(node, options) {
    switch (node.type) {
        case Root:
            return render$1(node.children, options);
        // @ts-expect-error We don't use `Doctype` yet
        case Doctype:
        case Directive:
            return renderDirective(node);
        case Comment$1:
            return renderComment(node);
        case CDATA$1:
            return renderCdata(node);
        case Script:
        case Style:
        case Tag:
            return renderTag(node, options);
        case Text$1:
            return renderText(node, options);
    }
}
const foreignModeIntegrationPoints = new Set([
    "mi",
    "mo",
    "mn",
    "ms",
    "mtext",
    "annotation-xml",
    "foreignObject",
    "desc",
    "title",
]);
const foreignElements = new Set(["svg", "math"]);
function renderTag(elem, opts) {
    var _a;
    // Handle SVG / MathML in HTML
    if (opts.xmlMode === "foreign") {
        /* Fix up mixed-case element names */
        elem.name = (_a = elementNames.get(elem.name)) !== null && _a !== void 0 ? _a : elem.name;
        /* Exit foreign mode at integration points */
        if (elem.parent &&
            foreignModeIntegrationPoints.has(elem.parent.name)) {
            opts = { ...opts, xmlMode: false };
        }
    }
    if (!opts.xmlMode && foreignElements.has(elem.name)) {
        opts = { ...opts, xmlMode: "foreign" };
    }
    let tag = `<${elem.name}`;
    const attribs = formatAttributes(elem.attribs, opts);
    if (attribs) {
        tag += ` ${attribs}`;
    }
    if (elem.children.length === 0 &&
        (opts.xmlMode
            ? // In XML mode or foreign mode, and user hasn't explicitly turned off self-closing tags
                opts.selfClosingTags !== false
            : // User explicitly asked for self-closing tags, even in HTML mode
                opts.selfClosingTags && singleTag.has(elem.name))) {
        if (!opts.xmlMode)
            tag += " ";
        tag += "/>";
    }
    else {
        tag += ">";
        if (elem.children.length > 0) {
            tag += render$1(elem.children, opts);
        }
        if (opts.xmlMode || !singleTag.has(elem.name)) {
            tag += `</${elem.name}>`;
        }
    }
    return tag;
}
function renderDirective(elem) {
    return `<${elem.data}>`;
}
function renderText(elem, opts) {
    var _a;
    let data = elem.data || "";
    // If entities weren't decoded, no need to encode them back
    if (((_a = opts.encodeEntities) !== null && _a !== void 0 ? _a : opts.decodeEntities) !== false &&
        !(!opts.xmlMode &&
            elem.parent &&
            unencodedElements.has(elem.parent.name))) {
        data =
            opts.xmlMode || opts.encodeEntities !== "utf8"
                ? encodeXML(data)
                : escapeText$1(data);
    }
    return data;
}
function renderCdata(elem) {
    return `<![CDATA[${elem.children[0].data}]]>`;
}
function renderComment(elem) {
    return `<!--${elem.data}-->`;
}

/**
 * @category Stringify
 * @deprecated Use the `dom-serializer` module directly.
 * @param node Node to get the outer HTML of.
 * @param options Options for serialization.
 * @returns `node`'s outer HTML.
 */
function getOuterHTML(node, options) {
    return render$1(node, options);
}
/**
 * @category Stringify
 * @deprecated Use the `dom-serializer` module directly.
 * @param node Node to get the inner HTML of.
 * @param options Options for serialization.
 * @returns `node`'s inner HTML.
 */
function getInnerHTML(node, options) {
    return hasChildren(node)
        ? node.children.map((node) => getOuterHTML(node, options)).join("")
        : "";
}
/**
 * Get a node's inner text. Same as `textContent`, but inserts newlines for `<br>` tags. Ignores comments.
 *
 * @category Stringify
 * @deprecated Use `textContent` instead.
 * @param node Node to get the inner text of.
 * @returns `node`'s inner text.
 */
function getText(node) {
    if (Array.isArray(node))
        return node.map(getText).join("");
    if (isTag(node))
        return node.name === "br" ? "\n" : getText(node.children);
    if (isCDATA(node))
        return getText(node.children);
    if (isText(node))
        return node.data;
    return "";
}
/**
 * Get a node's text content. Ignores comments.
 *
 * @category Stringify
 * @param node Node to get the text content of.
 * @returns `node`'s text content.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent}
 */
function textContent(node) {
    if (Array.isArray(node))
        return node.map(textContent).join("");
    if (hasChildren(node) && !isComment(node)) {
        return textContent(node.children);
    }
    if (isText(node))
        return node.data;
    return "";
}
/**
 * Get a node's inner text, ignoring `<script>` and `<style>` tags. Ignores comments.
 *
 * @category Stringify
 * @param node Node to get the inner text of.
 * @returns `node`'s inner text.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Node/innerText}
 */
function innerText(node) {
    if (Array.isArray(node))
        return node.map(innerText).join("");
    if (hasChildren(node) && (node.type === ElementType.Tag || isCDATA(node))) {
        return innerText(node.children);
    }
    if (isText(node))
        return node.data;
    return "";
}

/**
 * Get a node's children.
 *
 * @category Traversal
 * @param elem Node to get the children of.
 * @returns `elem`'s children, or an empty array.
 */
function getChildren(elem) {
    return hasChildren(elem) ? elem.children : [];
}
/**
 * Get a node's parent.
 *
 * @category Traversal
 * @param elem Node to get the parent of.
 * @returns `elem`'s parent node, or `null` if `elem` is a root node.
 */
function getParent(elem) {
    return elem.parent || null;
}
/**
 * Gets an elements siblings, including the element itself.
 *
 * Attempts to get the children through the element's parent first. If we don't
 * have a parent (the element is a root node), we walk the element's `prev` &
 * `next` to get all remaining nodes.
 *
 * @category Traversal
 * @param elem Element to get the siblings of.
 * @returns `elem`'s siblings, including `elem`.
 */
function getSiblings(elem) {
    const parent = getParent(elem);
    if (parent != null)
        return getChildren(parent);
    const siblings = [elem];
    let { prev, next } = elem;
    while (prev != null) {
        siblings.unshift(prev);
        ({ prev } = prev);
    }
    while (next != null) {
        siblings.push(next);
        ({ next } = next);
    }
    return siblings;
}
/**
 * Gets an attribute from an element.
 *
 * @category Traversal
 * @param elem Element to check.
 * @param name Attribute name to retrieve.
 * @returns The element's attribute value, or `undefined`.
 */
function getAttributeValue(elem, name) {
    var _a;
    return (_a = elem.attribs) === null || _a === void 0 ? void 0 : _a[name];
}
/**
 * Checks whether an element has an attribute.
 *
 * @category Traversal
 * @param elem Element to check.
 * @param name Attribute name to look for.
 * @returns Returns whether `elem` has the attribute `name`.
 */
function hasAttrib(elem, name) {
    return (elem.attribs != null &&
        Object.prototype.hasOwnProperty.call(elem.attribs, name) &&
        elem.attribs[name] != null);
}
/**
 * Get the tag name of an element.
 *
 * @category Traversal
 * @param elem The element to get the name for.
 * @returns The tag name of `elem`.
 */
function getName(elem) {
    return elem.name;
}
/**
 * Returns the next element sibling of a node.
 *
 * @category Traversal
 * @param elem The element to get the next sibling of.
 * @returns `elem`'s next sibling that is a tag, or `null` if there is no next
 * sibling.
 */
function nextElementSibling(elem) {
    let { next } = elem;
    while (next !== null && !isTag(next))
        ({ next } = next);
    return next;
}
/**
 * Returns the previous element sibling of a node.
 *
 * @category Traversal
 * @param elem The element to get the previous sibling of.
 * @returns `elem`'s previous sibling that is a tag, or `null` if there is no
 * previous sibling.
 */
function prevElementSibling(elem) {
    let { prev } = elem;
    while (prev !== null && !isTag(prev))
        ({ prev } = prev);
    return prev;
}

/**
 * Remove an element from the dom
 *
 * @category Manipulation
 * @param elem The element to be removed
 */
function removeElement(elem) {
    if (elem.prev)
        elem.prev.next = elem.next;
    if (elem.next)
        elem.next.prev = elem.prev;
    if (elem.parent) {
        const childs = elem.parent.children;
        const childsIndex = childs.lastIndexOf(elem);
        if (childsIndex >= 0) {
            childs.splice(childsIndex, 1);
        }
    }
    elem.next = null;
    elem.prev = null;
    elem.parent = null;
}
/**
 * Replace an element in the dom
 *
 * @category Manipulation
 * @param elem The element to be replaced
 * @param replacement The element to be added
 */
function replaceElement(elem, replacement) {
    const prev = (replacement.prev = elem.prev);
    if (prev) {
        prev.next = replacement;
    }
    const next = (replacement.next = elem.next);
    if (next) {
        next.prev = replacement;
    }
    const parent = (replacement.parent = elem.parent);
    if (parent) {
        const childs = parent.children;
        childs[childs.lastIndexOf(elem)] = replacement;
        elem.parent = null;
    }
}
/**
 * Append a child to an element.
 *
 * @category Manipulation
 * @param parent The element to append to.
 * @param child The element to be added as a child.
 */
function appendChild(parent, child) {
    removeElement(child);
    child.next = null;
    child.parent = parent;
    if (parent.children.push(child) > 1) {
        const sibling = parent.children[parent.children.length - 2];
        sibling.next = child;
        child.prev = sibling;
    }
    else {
        child.prev = null;
    }
}
/**
 * Append an element after another.
 *
 * @category Manipulation
 * @param elem The element to append after.
 * @param next The element be added.
 */
function append$1(elem, next) {
    removeElement(next);
    const { parent } = elem;
    const currNext = elem.next;
    next.next = currNext;
    next.prev = elem;
    elem.next = next;
    next.parent = parent;
    if (currNext) {
        currNext.prev = next;
        if (parent) {
            const childs = parent.children;
            childs.splice(childs.lastIndexOf(currNext), 0, next);
        }
    }
    else if (parent) {
        parent.children.push(next);
    }
}
/**
 * Prepend a child to an element.
 *
 * @category Manipulation
 * @param parent The element to prepend before.
 * @param child The element to be added as a child.
 */
function prependChild(parent, child) {
    removeElement(child);
    child.parent = parent;
    child.prev = null;
    if (parent.children.unshift(child) !== 1) {
        const sibling = parent.children[1];
        sibling.prev = child;
        child.next = sibling;
    }
    else {
        child.next = null;
    }
}
/**
 * Prepend an element before another.
 *
 * @category Manipulation
 * @param elem The element to prepend before.
 * @param prev The element be added.
 */
function prepend$1(elem, prev) {
    removeElement(prev);
    const { parent } = elem;
    if (parent) {
        const childs = parent.children;
        childs.splice(childs.indexOf(elem), 0, prev);
    }
    if (elem.prev) {
        elem.prev.next = prev;
    }
    prev.parent = parent;
    prev.prev = elem.prev;
    prev.next = elem;
    elem.prev = prev;
}

/**
 * Search a node and its children for nodes passing a test function. If `node` is not an array, it will be wrapped in one.
 *
 * @category Querying
 * @param test Function to test nodes on.
 * @param node Node to search. Will be included in the result set if it matches.
 * @param recurse Also consider child nodes.
 * @param limit Maximum number of nodes to return.
 * @returns All nodes passing `test`.
 */
function filter$2(test, node, recurse = true, limit = Infinity) {
    return find$2(test, Array.isArray(node) ? node : [node], recurse, limit);
}
/**
 * Search an array of nodes and their children for nodes passing a test function.
 *
 * @category Querying
 * @param test Function to test nodes on.
 * @param nodes Array of nodes to search.
 * @param recurse Also consider child nodes.
 * @param limit Maximum number of nodes to return.
 * @returns All nodes passing `test`.
 */
function find$2(test, nodes, recurse, limit) {
    const result = [];
    /** Stack of the arrays we are looking at. */
    const nodeStack = [Array.isArray(nodes) ? nodes : [nodes]];
    /** Stack of the indices within the arrays. */
    const indexStack = [0];
    for (;;) {
        // First, check if the current array has any more elements to look at.
        if (indexStack[0] >= nodeStack[0].length) {
            // If we have no more arrays to look at, we are done.
            if (indexStack.length === 1) {
                return result;
            }
            // Otherwise, remove the current array from the stack.
            nodeStack.shift();
            indexStack.shift();
            // Loop back to the start to continue with the next array.
            continue;
        }
        const elem = nodeStack[0][indexStack[0]++];
        if (test(elem)) {
            result.push(elem);
            if (--limit <= 0)
                return result;
        }
        if (recurse && hasChildren(elem) && elem.children.length > 0) {
            /*
             * Add the children to the stack. We are depth-first, so this is
             * the next array we look at.
             */
            indexStack.unshift(0);
            nodeStack.unshift(elem.children);
        }
    }
}
/**
 * Finds the first element inside of an array that matches a test function. This is an alias for `Array.prototype.find`.
 *
 * @category Querying
 * @param test Function to test nodes on.
 * @param nodes Array of nodes to search.
 * @returns The first node in the array that passes `test`.
 * @deprecated Use `Array.prototype.find` directly.
 */
function findOneChild(test, nodes) {
    return nodes.find(test);
}
/**
 * Finds one element in a tree that passes a test.
 *
 * @category Querying
 * @param test Function to test nodes on.
 * @param nodes Node or array of nodes to search.
 * @param recurse Also consider child nodes.
 * @returns The first node that passes `test`.
 */
function findOne(test, nodes, recurse = true) {
    const searchedNodes = Array.isArray(nodes) ? nodes : [nodes];
    for (let i = 0; i < searchedNodes.length; i++) {
        const node = searchedNodes[i];
        if (isTag(node) && test(node)) {
            return node;
        }
        if (recurse && hasChildren(node) && node.children.length > 0) {
            const found = findOne(test, node.children, true);
            if (found)
                return found;
        }
    }
    return null;
}
/**
 * Checks if a tree of nodes contains at least one node passing a test.
 *
 * @category Querying
 * @param test Function to test nodes on.
 * @param nodes Array of nodes to search.
 * @returns Whether a tree of nodes contains at least one node passing the test.
 */
function existsOne(test, nodes) {
    return (Array.isArray(nodes) ? nodes : [nodes]).some((node) => (isTag(node) && test(node)) ||
        (hasChildren(node) && existsOne(test, node.children)));
}
/**
 * Search an array of nodes and their children for elements passing a test function.
 *
 * Same as `find`, but limited to elements and with less options, leading to reduced complexity.
 *
 * @category Querying
 * @param test Function to test nodes on.
 * @param nodes Array of nodes to search.
 * @returns All nodes passing `test`.
 */
function findAll(test, nodes) {
    const result = [];
    const nodeStack = [Array.isArray(nodes) ? nodes : [nodes]];
    const indexStack = [0];
    for (;;) {
        if (indexStack[0] >= nodeStack[0].length) {
            if (nodeStack.length === 1) {
                return result;
            }
            // Otherwise, remove the current array from the stack.
            nodeStack.shift();
            indexStack.shift();
            // Loop back to the start to continue with the next array.
            continue;
        }
        const elem = nodeStack[0][indexStack[0]++];
        if (isTag(elem) && test(elem))
            result.push(elem);
        if (hasChildren(elem) && elem.children.length > 0) {
            indexStack.unshift(0);
            nodeStack.unshift(elem.children);
        }
    }
}

/**
 * A map of functions to check nodes against.
 */
const Checks = {
    tag_name(name) {
        if (typeof name === "function") {
            return (elem) => isTag(elem) && name(elem.name);
        }
        else if (name === "*") {
            return isTag;
        }
        return (elem) => isTag(elem) && elem.name === name;
    },
    tag_type(type) {
        if (typeof type === "function") {
            return (elem) => type(elem.type);
        }
        return (elem) => elem.type === type;
    },
    tag_contains(data) {
        if (typeof data === "function") {
            return (elem) => isText(elem) && data(elem.data);
        }
        return (elem) => isText(elem) && elem.data === data;
    },
};
/**
 * Returns a function to check whether a node has an attribute with a particular
 * value.
 *
 * @param attrib Attribute to check.
 * @param value Attribute value to look for.
 * @returns A function to check whether the a node has an attribute with a
 *   particular value.
 */
function getAttribCheck(attrib, value) {
    if (typeof value === "function") {
        return (elem) => isTag(elem) && value(elem.attribs[attrib]);
    }
    return (elem) => isTag(elem) && elem.attribs[attrib] === value;
}
/**
 * Returns a function that returns `true` if either of the input functions
 * returns `true` for a node.
 *
 * @param a First function to combine.
 * @param b Second function to combine.
 * @returns A function taking a node and returning `true` if either of the input
 *   functions returns `true` for the node.
 */
function combineFuncs(a, b) {
    return (elem) => a(elem) || b(elem);
}
/**
 * Returns a function that executes all checks in `options` and returns `true`
 * if any of them match a node.
 *
 * @param options An object describing nodes to look for.
 * @returns A function that executes all checks in `options` and returns `true`
 *   if any of them match a node.
 */
function compileTest(options) {
    const funcs = Object.keys(options).map((key) => {
        const value = options[key];
        return Object.prototype.hasOwnProperty.call(Checks, key)
            ? Checks[key](value)
            : getAttribCheck(key, value);
    });
    return funcs.length === 0 ? null : funcs.reduce(combineFuncs);
}
/**
 * Checks whether a node matches the description in `options`.
 *
 * @category Legacy Query Functions
 * @param options An object describing nodes to look for.
 * @param node The element to test.
 * @returns Whether the element matches the description in `options`.
 */
function testElement(options, node) {
    const test = compileTest(options);
    return test ? test(node) : true;
}
/**
 * Returns all nodes that match `options`.
 *
 * @category Legacy Query Functions
 * @param options An object describing nodes to look for.
 * @param nodes Nodes to search through.
 * @param recurse Also consider child nodes.
 * @param limit Maximum number of nodes to return.
 * @returns All nodes that match `options`.
 */
function getElements(options, nodes, recurse, limit = Infinity) {
    const test = compileTest(options);
    return test ? filter$2(test, nodes, recurse, limit) : [];
}
/**
 * Returns the node with the supplied ID.
 *
 * @category Legacy Query Functions
 * @param id The unique ID attribute value to look for.
 * @param nodes Nodes to search through.
 * @param recurse Also consider child nodes.
 * @returns The node with the supplied ID.
 */
function getElementById(id, nodes, recurse = true) {
    if (!Array.isArray(nodes))
        nodes = [nodes];
    return findOne(getAttribCheck("id", id), nodes, recurse);
}
/**
 * Returns all nodes with the supplied `tagName`.
 *
 * @category Legacy Query Functions
 * @param tagName Tag name to search for.
 * @param nodes Nodes to search through.
 * @param recurse Also consider child nodes.
 * @param limit Maximum number of nodes to return.
 * @returns All nodes with the supplied `tagName`.
 */
function getElementsByTagName(tagName, nodes, recurse = true, limit = Infinity) {
    return filter$2(Checks["tag_name"](tagName), nodes, recurse, limit);
}
/**
 * Returns all nodes with the supplied `className`.
 *
 * @category Legacy Query Functions
 * @param className Class name to search for.
 * @param nodes Nodes to search through.
 * @param recurse Also consider child nodes.
 * @param limit Maximum number of nodes to return.
 * @returns All nodes with the supplied `className`.
 */
function getElementsByClassName(className, nodes, recurse = true, limit = Infinity) {
    return filter$2(getAttribCheck("class", className), nodes, recurse, limit);
}
/**
 * Returns all nodes with the supplied `type`.
 *
 * @category Legacy Query Functions
 * @param type Element type to look for.
 * @param nodes Nodes to search through.
 * @param recurse Also consider child nodes.
 * @param limit Maximum number of nodes to return.
 * @returns All nodes with the supplied `type`.
 */
function getElementsByTagType(type, nodes, recurse = true, limit = Infinity) {
    return filter$2(Checks["tag_type"](type), nodes, recurse, limit);
}

/**
 * Given an array of nodes, remove any member that is contained by another
 * member.
 *
 * @category Helpers
 * @param nodes Nodes to filter.
 * @returns Remaining nodes that aren't contained by other nodes.
 */
function removeSubsets(nodes) {
    let idx = nodes.length;
    /*
     * Check if each node (or one of its ancestors) is already contained in the
     * array.
     */
    while (--idx >= 0) {
        const node = nodes[idx];
        /*
         * Remove the node if it is not unique.
         * We are going through the array from the end, so we only
         * have to check nodes that preceed the node under consideration in the array.
         */
        if (idx > 0 && nodes.lastIndexOf(node, idx - 1) >= 0) {
            nodes.splice(idx, 1);
            continue;
        }
        for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
            if (nodes.includes(ancestor)) {
                nodes.splice(idx, 1);
                break;
            }
        }
    }
    return nodes;
}
/**
 * @category Helpers
 * @see {@link http://dom.spec.whatwg.org/#dom-node-comparedocumentposition}
 */
var DocumentPosition;
(function (DocumentPosition) {
    DocumentPosition[DocumentPosition["DISCONNECTED"] = 1] = "DISCONNECTED";
    DocumentPosition[DocumentPosition["PRECEDING"] = 2] = "PRECEDING";
    DocumentPosition[DocumentPosition["FOLLOWING"] = 4] = "FOLLOWING";
    DocumentPosition[DocumentPosition["CONTAINS"] = 8] = "CONTAINS";
    DocumentPosition[DocumentPosition["CONTAINED_BY"] = 16] = "CONTAINED_BY";
})(DocumentPosition || (DocumentPosition = {}));
/**
 * Compare the position of one node against another node in any other document,
 * returning a bitmask with the values from {@link DocumentPosition}.
 *
 * Document order:
 * > There is an ordering, document order, defined on all the nodes in the
 * > document corresponding to the order in which the first character of the
 * > XML representation of each node occurs in the XML representation of the
 * > document after expansion of general entities. Thus, the document element
 * > node will be the first node. Element nodes occur before their children.
 * > Thus, document order orders element nodes in order of the occurrence of
 * > their start-tag in the XML (after expansion of entities). The attribute
 * > nodes of an element occur after the element and before its children. The
 * > relative order of attribute nodes is implementation-dependent.
 *
 * Source:
 * http://www.w3.org/TR/DOM-Level-3-Core/glossary.html#dt-document-order
 *
 * @category Helpers
 * @param nodeA The first node to use in the comparison
 * @param nodeB The second node to use in the comparison
 * @returns A bitmask describing the input nodes' relative position.
 *
 * See http://dom.spec.whatwg.org/#dom-node-comparedocumentposition for
 * a description of these values.
 */
function compareDocumentPosition(nodeA, nodeB) {
    const aParents = [];
    const bParents = [];
    if (nodeA === nodeB) {
        return 0;
    }
    let current = hasChildren(nodeA) ? nodeA : nodeA.parent;
    while (current) {
        aParents.unshift(current);
        current = current.parent;
    }
    current = hasChildren(nodeB) ? nodeB : nodeB.parent;
    while (current) {
        bParents.unshift(current);
        current = current.parent;
    }
    const maxIdx = Math.min(aParents.length, bParents.length);
    let idx = 0;
    while (idx < maxIdx && aParents[idx] === bParents[idx]) {
        idx++;
    }
    if (idx === 0) {
        return DocumentPosition.DISCONNECTED;
    }
    const sharedParent = aParents[idx - 1];
    const siblings = sharedParent.children;
    const aSibling = aParents[idx];
    const bSibling = bParents[idx];
    if (siblings.indexOf(aSibling) > siblings.indexOf(bSibling)) {
        if (sharedParent === nodeB) {
            return DocumentPosition.FOLLOWING | DocumentPosition.CONTAINED_BY;
        }
        return DocumentPosition.FOLLOWING;
    }
    if (sharedParent === nodeA) {
        return DocumentPosition.PRECEDING | DocumentPosition.CONTAINS;
    }
    return DocumentPosition.PRECEDING;
}
/**
 * Sort an array of nodes based on their relative position in the document,
 * removing any duplicate nodes. If the array contains nodes that do not belong
 * to the same document, sort order is unspecified.
 *
 * @category Helpers
 * @param nodes Array of DOM nodes.
 * @returns Collection of unique nodes, sorted in document order.
 */
function uniqueSort(nodes) {
    nodes = nodes.filter((node, i, arr) => !arr.includes(node, i + 1));
    nodes.sort((a, b) => {
        const relative = compareDocumentPosition(a, b);
        if (relative & DocumentPosition.PRECEDING) {
            return -1;
        }
        else if (relative & DocumentPosition.FOLLOWING) {
            return 1;
        }
        return 0;
    });
    return nodes;
}

/**
 * Get the feed object from the root of a DOM tree.
 *
 * @category Feeds
 * @param doc - The DOM to to extract the feed from.
 * @returns The feed.
 */
function getFeed(doc) {
    const feedRoot = getOneElement(isValidFeed, doc);
    return !feedRoot
        ? null
        : feedRoot.name === "feed"
            ? getAtomFeed(feedRoot)
            : getRssFeed(feedRoot);
}
/**
 * Parse an Atom feed.
 *
 * @param feedRoot The root of the feed.
 * @returns The parsed feed.
 */
function getAtomFeed(feedRoot) {
    var _a;
    const childs = feedRoot.children;
    const feed = {
        type: "atom",
        items: getElementsByTagName("entry", childs).map((item) => {
            var _a;
            const { children } = item;
            const entry = { media: getMediaElements(children) };
            addConditionally(entry, "id", "id", children);
            addConditionally(entry, "title", "title", children);
            const href = (_a = getOneElement("link", children)) === null || _a === void 0 ? void 0 : _a.attribs["href"];
            if (href) {
                entry.link = href;
            }
            const description = fetch$1("summary", children) || fetch$1("content", children);
            if (description) {
                entry.description = description;
            }
            const pubDate = fetch$1("updated", children);
            if (pubDate) {
                entry.pubDate = new Date(pubDate);
            }
            return entry;
        }),
    };
    addConditionally(feed, "id", "id", childs);
    addConditionally(feed, "title", "title", childs);
    const href = (_a = getOneElement("link", childs)) === null || _a === void 0 ? void 0 : _a.attribs["href"];
    if (href) {
        feed.link = href;
    }
    addConditionally(feed, "description", "subtitle", childs);
    const updated = fetch$1("updated", childs);
    if (updated) {
        feed.updated = new Date(updated);
    }
    addConditionally(feed, "author", "email", childs, true);
    return feed;
}
/**
 * Parse a RSS feed.
 *
 * @param feedRoot The root of the feed.
 * @returns The parsed feed.
 */
function getRssFeed(feedRoot) {
    var _a, _b;
    const childs = (_b = (_a = getOneElement("channel", feedRoot.children)) === null || _a === void 0 ? void 0 : _a.children) !== null && _b !== void 0 ? _b : [];
    const feed = {
        type: feedRoot.name.substr(0, 3),
        id: "",
        items: getElementsByTagName("item", feedRoot.children).map((item) => {
            const { children } = item;
            const entry = { media: getMediaElements(children) };
            addConditionally(entry, "id", "guid", children);
            addConditionally(entry, "title", "title", children);
            addConditionally(entry, "link", "link", children);
            addConditionally(entry, "description", "description", children);
            const pubDate = fetch$1("pubDate", children) || fetch$1("dc:date", children);
            if (pubDate)
                entry.pubDate = new Date(pubDate);
            return entry;
        }),
    };
    addConditionally(feed, "title", "title", childs);
    addConditionally(feed, "link", "link", childs);
    addConditionally(feed, "description", "description", childs);
    const updated = fetch$1("lastBuildDate", childs);
    if (updated) {
        feed.updated = new Date(updated);
    }
    addConditionally(feed, "author", "managingEditor", childs, true);
    return feed;
}
const MEDIA_KEYS_STRING = ["url", "type", "lang"];
const MEDIA_KEYS_INT = [
    "fileSize",
    "bitrate",
    "framerate",
    "samplingrate",
    "channels",
    "duration",
    "height",
    "width",
];
/**
 * Get all media elements of a feed item.
 *
 * @param where Nodes to search in.
 * @returns Media elements.
 */
function getMediaElements(where) {
    return getElementsByTagName("media:content", where).map((elem) => {
        const { attribs } = elem;
        const media = {
            medium: attribs["medium"],
            isDefault: !!attribs["isDefault"],
        };
        for (const attrib of MEDIA_KEYS_STRING) {
            if (attribs[attrib]) {
                media[attrib] = attribs[attrib];
            }
        }
        for (const attrib of MEDIA_KEYS_INT) {
            if (attribs[attrib]) {
                media[attrib] = parseInt(attribs[attrib], 10);
            }
        }
        if (attribs["expression"]) {
            media.expression = attribs["expression"];
        }
        return media;
    });
}
/**
 * Get one element by tag name.
 *
 * @param tagName Tag name to look for
 * @param node Node to search in
 * @returns The element or null
 */
function getOneElement(tagName, node) {
    return getElementsByTagName(tagName, node, true, 1)[0];
}
/**
 * Get the text content of an element with a certain tag name.
 *
 * @param tagName Tag name to look for.
 * @param where Node to search in.
 * @param recurse Whether to recurse into child nodes.
 * @returns The text content of the element.
 */
function fetch$1(tagName, where, recurse = false) {
    return textContent(getElementsByTagName(tagName, where, recurse, 1)).trim();
}
/**
 * Adds a property to an object if it has a value.
 *
 * @param obj Object to be extended
 * @param prop Property name
 * @param tagName Tag name that contains the conditionally added property
 * @param where Element to search for the property
 * @param recurse Whether to recurse into child nodes.
 */
function addConditionally(obj, prop, tagName, where, recurse = false) {
    const val = fetch$1(tagName, where, recurse);
    if (val)
        obj[prop] = val;
}
/**
 * Checks if an element is a feed root node.
 *
 * @param value The name of the element to check.
 * @returns Whether an element is a feed root node.
 */
function isValidFeed(value) {
    return value === "rss" || value === "feed" || value === "rdf:RDF";
}

var DomUtils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    isTag: isTag,
    isCDATA: isCDATA,
    isText: isText,
    isComment: isComment,
    isDocument: isDocument,
    hasChildren: hasChildren,
    getOuterHTML: getOuterHTML,
    getInnerHTML: getInnerHTML,
    getText: getText,
    textContent: textContent,
    innerText: innerText,
    getChildren: getChildren,
    getParent: getParent,
    getSiblings: getSiblings,
    getAttributeValue: getAttributeValue,
    hasAttrib: hasAttrib,
    getName: getName,
    nextElementSibling: nextElementSibling,
    prevElementSibling: prevElementSibling,
    removeElement: removeElement,
    replaceElement: replaceElement,
    appendChild: appendChild,
    append: append$1,
    prependChild: prependChild,
    prepend: prepend$1,
    filter: filter$2,
    find: find$2,
    findOneChild: findOneChild,
    findOne: findOne,
    existsOne: existsOne,
    findAll: findAll,
    testElement: testElement,
    getElements: getElements,
    getElementById: getElementById,
    getElementsByTagName: getElementsByTagName,
    getElementsByClassName: getElementsByClassName,
    getElementsByTagType: getElementsByTagType,
    removeSubsets: removeSubsets,
    get DocumentPosition () { return DocumentPosition; },
    compareDocumentPosition: compareDocumentPosition,
    uniqueSort: uniqueSort,
    getFeed: getFeed
});

const defaultOpts$1 = {
    _useHtmlParser2: false,
};
/**
 * Flatten the options for Cheerio.
 *
 * This will set `_useHtmlParser2` to true if `xml` is set to true.
 *
 * @param options - The options to flatten.
 * @param baseOptions - The base options to use.
 * @returns The flattened options.
 */
function flattenOptions(options, baseOptions) {
    if (!options) {
        return baseOptions !== null && baseOptions !== void 0 ? baseOptions : defaultOpts$1;
    }
    const opts = {
        _useHtmlParser2: !!options.xmlMode,
        ...baseOptions,
        ...options,
    };
    if (options.xml) {
        opts._useHtmlParser2 = true;
        opts.xmlMode = true;
        if (options.xml !== true) {
            Object.assign(opts, options.xml);
        }
    }
    else if (options.xmlMode) {
        opts._useHtmlParser2 = true;
    }
    return opts;
}

/**
 * Helper function to render a DOM.
 *
 * @param that - Cheerio instance to render.
 * @param dom - The DOM to render. Defaults to `that`'s root.
 * @param options - Options for rendering.
 * @returns The rendered document.
 */
function render(that, dom, options) {
    if (!that)
        return '';
    return that(dom !== null && dom !== void 0 ? dom : that._root.children, null, undefined, options).toString();
}
/**
 * Checks if a passed object is an options object.
 *
 * @param dom - Object to check if it is an options object.
 * @param options - Options object.
 * @returns Whether the object is an options object.
 */
function isOptions(dom, options) {
    return (!options &&
        typeof dom === 'object' &&
        dom != null &&
        !('length' in dom) &&
        !('type' in dom));
}
function html$1(dom, options) {
    /*
     * Be flexible about parameters, sometimes we call html(),
     * with options as only parameter
     * check dom argument for dom element specific properties
     * assume there is no 'length' or 'type' properties in the options object
     */
    const toRender = isOptions(dom) ? ((options = dom), undefined) : dom;
    /*
     * Sometimes `$.html()` is used without preloading html,
     * so fallback non-existing options to the default ones.
     */
    const opts = {
        ...this === null || this === void 0 ? void 0 : this._options,
        ...flattenOptions(options),
    };
    return render(this, toRender, opts);
}
/**
 * Render the document as XML.
 *
 * @category Static
 * @param dom - Element to render.
 * @returns THe rendered document.
 */
function xml(dom) {
    const options = { ...this._options, xmlMode: true };
    return render(this, dom, options);
}
/**
 * Render the document as text.
 *
 * This returns the `textContent` of the passed elements. The result will
 * include the contents of `<script>` and `<style>` elements. To avoid this, use
 * `.prop('innerText')` instead.
 *
 * @category Static
 * @param elements - Elements to render.
 * @returns The rendered document.
 */
function text$1(elements) {
    const elems = elements !== null && elements !== void 0 ? elements : (this ? this.root() : []);
    let ret = '';
    for (let i = 0; i < elems.length; i++) {
        ret += textContent(elems[i]);
    }
    return ret;
}
function parseHTML(data, context, keepScripts = typeof context === 'boolean' ? context : false) {
    if (!data || typeof data !== 'string') {
        return null;
    }
    if (typeof context === 'boolean') {
        keepScripts = context;
    }
    const parsed = this.load(data, this._options, false);
    if (!keepScripts) {
        parsed('script').remove();
    }
    /*
     * The `children` array is used by Cheerio internally to group elements that
     * share the same parents. When nodes created through `parseHTML` are
     * inserted into previously-existing DOM structures, they will be removed
     * from the `children` array. The results of `parseHTML` should remain
     * constant across these operations, so a shallow copy should be returned.
     */
    return [...parsed.root()[0].children];
}
/**
 * Sometimes you need to work with the top-level root element. To query it, you
 * can use `$.root()`.
 *
 * @category Static
 * @example
 *
 * ```js
 * $.root().append('<ul id="vegetables"></ul>').html();
 * //=> <ul id="fruits">...</ul><ul id="vegetables"></ul>
 * ```
 *
 * @returns Cheerio instance wrapping the root node.
 * @alias Cheerio.root
 */
function root() {
    return this(this._root);
}
/**
 * Checks to see if the `contained` DOM element is a descendant of the
 * `container` DOM element.
 *
 * @category Static
 * @param container - Potential parent node.
 * @param contained - Potential child node.
 * @returns Indicates if the nodes contain one another.
 * @alias Cheerio.contains
 * @see {@link https://api.jquery.com/jQuery.contains/}
 */
function contains(container, contained) {
    // According to the jQuery API, an element does not "contain" itself
    if (contained === container) {
        return false;
    }
    /*
     * Step up the descendants, stopping when the root element is reached
     * (signaled by `.parent` returning a reference to the same object)
     */
    let next = contained;
    while (next && next !== next.parent) {
        next = next.parent;
        if (next === container) {
            return true;
        }
    }
    return false;
}
/**
 * Extract multiple values from a document, and store them in an object.
 *
 * @category Static
 * @param map - An object containing key-value pairs. The keys are the names of
 *   the properties to be created on the object, and the values are the
 *   selectors to be used to extract the values.
 * @returns An object containing the extracted values.
 */
function extract$1(map) {
    return this.root().extract(map);
}
/**
 * $.merge().
 *
 * @category Static
 * @param arr1 - First array.
 * @param arr2 - Second array.
 * @returns `arr1`, with elements of `arr2` inserted.
 * @alias Cheerio.merge
 * @see {@link https://api.jquery.com/jQuery.merge/}
 */
function merge(arr1, arr2) {
    if (!isArrayLike(arr1) || !isArrayLike(arr2)) {
        return;
    }
    let newLength = arr1.length;
    const len = +arr2.length;
    for (let i = 0; i < len; i++) {
        arr1[newLength++] = arr2[i];
    }
    arr1.length = newLength;
    return arr1;
}
/**
 * Checks if an object is array-like.
 *
 * @category Static
 * @param item - Item to check.
 * @returns Indicates if the item is array-like.
 */
function isArrayLike(item) {
    if (Array.isArray(item)) {
        return true;
    }
    if (typeof item !== 'object' ||
        item === null ||
        !('length' in item) ||
        typeof item.length !== 'number' ||
        item.length < 0) {
        return false;
    }
    for (let i = 0; i < item.length; i++) {
        if (!(i in item)) {
            return false;
        }
    }
    return true;
}

var staticMethods = /*#__PURE__*/Object.freeze({
    __proto__: null,
    html: html$1,
    xml: xml,
    text: text$1,
    parseHTML: parseHTML,
    root: root,
    contains: contains,
    extract: extract$1,
    merge: merge
});

/**
 * Checks if an object is a Cheerio instance.
 *
 * @category Utils
 * @param maybeCheerio - The object to check.
 * @returns Whether the object is a Cheerio instance.
 */
function isCheerio(maybeCheerio) {
    return maybeCheerio.cheerio != null;
}
/**
 * Convert a string to camel case notation.
 *
 * @private
 * @category Utils
 * @param str - The string to be converted.
 * @returns String in camel case notation.
 */
function camelCase(str) {
    return str.replace(/[._-](\w|$)/g, (_, x) => x.toUpperCase());
}
/**
 * Convert a string from camel case to "CSS case", where word boundaries are
 * described by hyphens ("-") and all characters are lower-case.
 *
 * @private
 * @category Utils
 * @param str - The string to be converted.
 * @returns String in "CSS case".
 */
function cssCase(str) {
    return str.replace(/[A-Z]/g, '-$&').toLowerCase();
}
/**
 * Iterate over each DOM element without creating intermediary Cheerio
 * instances.
 *
 * This is indented for use internally to avoid otherwise unnecessary memory
 * pressure introduced by _make.
 *
 * @category Utils
 * @param array - The array to iterate over.
 * @param fn - Function to call.
 * @returns The original instance.
 */
function domEach(array, fn) {
    const len = array.length;
    for (let i = 0; i < len; i++)
        fn(array[i], i);
    return array;
}
var CharacterCode;
(function (CharacterCode) {
    CharacterCode[CharacterCode["LowerA"] = 97] = "LowerA";
    CharacterCode[CharacterCode["LowerZ"] = 122] = "LowerZ";
    CharacterCode[CharacterCode["UpperA"] = 65] = "UpperA";
    CharacterCode[CharacterCode["UpperZ"] = 90] = "UpperZ";
    CharacterCode[CharacterCode["Exclamation"] = 33] = "Exclamation";
})(CharacterCode || (CharacterCode = {}));
/**
 * Check if string is HTML.
 *
 * Tests for a `<` within a string, immediate followed by a letter and
 * eventually followed by a `>`.
 *
 * @private
 * @category Utils
 * @param str - The string to check.
 * @returns Indicates if `str` is HTML.
 */
function isHtml(str) {
    const tagStart = str.indexOf('<');
    if (tagStart === -1 || tagStart > str.length - 3)
        return false;
    const tagChar = str.charCodeAt(tagStart + 1);
    return (((tagChar >= CharacterCode.LowerA && tagChar <= CharacterCode.LowerZ) ||
        (tagChar >= CharacterCode.UpperA && tagChar <= CharacterCode.UpperZ) ||
        tagChar === CharacterCode.Exclamation) &&
        str.includes('>', tagStart + 2));
}

// Generated using scripts/write-decode-map.ts
const htmlDecodeTree$1 = /* #__PURE__ */ new Uint16Array(
// prettier-ignore
/* #__PURE__ */ "\u1d41<\xd5\u0131\u028a\u049d\u057b\u05d0\u0675\u06de\u07a2\u07d6\u080f\u0a4a\u0a91\u0da1\u0e6d\u0f09\u0f26\u10ca\u1228\u12e1\u1415\u149d\u14c3\u14df\u1525\0\0\0\0\0\0\u156b\u16cd\u198d\u1c12\u1ddd\u1f7e\u2060\u21b0\u228d\u23c0\u23fb\u2442\u2824\u2912\u2d08\u2e48\u2fce\u3016\u32ba\u3639\u37ac\u38fe\u3a28\u3a71\u3ae0\u3b2e\u0800EMabcfglmnoprstu\\bfms\x7f\x84\x8b\x90\x95\x98\xa6\xb3\xb9\xc8\xcflig\u803b\xc6\u40c6P\u803b&\u4026cute\u803b\xc1\u40c1reve;\u4102\u0100iyx}rc\u803b\xc2\u40c2;\u4410r;\uc000\ud835\udd04rave\u803b\xc0\u40c0pha;\u4391acr;\u4100d;\u6a53\u0100gp\x9d\xa1on;\u4104f;\uc000\ud835\udd38plyFunction;\u6061ing\u803b\xc5\u40c5\u0100cs\xbe\xc3r;\uc000\ud835\udc9cign;\u6254ilde\u803b\xc3\u40c3ml\u803b\xc4\u40c4\u0400aceforsu\xe5\xfb\xfe\u0117\u011c\u0122\u0127\u012a\u0100cr\xea\xf2kslash;\u6216\u0176\xf6\xf8;\u6ae7ed;\u6306y;\u4411\u0180crt\u0105\u010b\u0114ause;\u6235noullis;\u612ca;\u4392r;\uc000\ud835\udd05pf;\uc000\ud835\udd39eve;\u42d8c\xf2\u0113mpeq;\u624e\u0700HOacdefhilorsu\u014d\u0151\u0156\u0180\u019e\u01a2\u01b5\u01b7\u01ba\u01dc\u0215\u0273\u0278\u027ecy;\u4427PY\u803b\xa9\u40a9\u0180cpy\u015d\u0162\u017aute;\u4106\u0100;i\u0167\u0168\u62d2talDifferentialD;\u6145leys;\u612d\u0200aeio\u0189\u018e\u0194\u0198ron;\u410cdil\u803b\xc7\u40c7rc;\u4108nint;\u6230ot;\u410a\u0100dn\u01a7\u01adilla;\u40b8terDot;\u40b7\xf2\u017fi;\u43a7rcle\u0200DMPT\u01c7\u01cb\u01d1\u01d6ot;\u6299inus;\u6296lus;\u6295imes;\u6297o\u0100cs\u01e2\u01f8kwiseContourIntegral;\u6232eCurly\u0100DQ\u0203\u020foubleQuote;\u601duote;\u6019\u0200lnpu\u021e\u0228\u0247\u0255on\u0100;e\u0225\u0226\u6237;\u6a74\u0180git\u022f\u0236\u023aruent;\u6261nt;\u622fourIntegral;\u622e\u0100fr\u024c\u024e;\u6102oduct;\u6210nterClockwiseContourIntegral;\u6233oss;\u6a2fcr;\uc000\ud835\udc9ep\u0100;C\u0284\u0285\u62d3ap;\u624d\u0580DJSZacefios\u02a0\u02ac\u02b0\u02b4\u02b8\u02cb\u02d7\u02e1\u02e6\u0333\u048d\u0100;o\u0179\u02a5trahd;\u6911cy;\u4402cy;\u4405cy;\u440f\u0180grs\u02bf\u02c4\u02c7ger;\u6021r;\u61a1hv;\u6ae4\u0100ay\u02d0\u02d5ron;\u410e;\u4414l\u0100;t\u02dd\u02de\u6207a;\u4394r;\uc000\ud835\udd07\u0100af\u02eb\u0327\u0100cm\u02f0\u0322ritical\u0200ADGT\u0300\u0306\u0316\u031ccute;\u40b4o\u0174\u030b\u030d;\u42d9bleAcute;\u42ddrave;\u4060ilde;\u42dcond;\u62c4ferentialD;\u6146\u0470\u033d\0\0\0\u0342\u0354\0\u0405f;\uc000\ud835\udd3b\u0180;DE\u0348\u0349\u034d\u40a8ot;\u60dcqual;\u6250ble\u0300CDLRUV\u0363\u0372\u0382\u03cf\u03e2\u03f8ontourIntegra\xec\u0239o\u0274\u0379\0\0\u037b\xbb\u0349nArrow;\u61d3\u0100eo\u0387\u03a4ft\u0180ART\u0390\u0396\u03a1rrow;\u61d0ightArrow;\u61d4e\xe5\u02cang\u0100LR\u03ab\u03c4eft\u0100AR\u03b3\u03b9rrow;\u67f8ightArrow;\u67faightArrow;\u67f9ight\u0100AT\u03d8\u03derrow;\u61d2ee;\u62a8p\u0241\u03e9\0\0\u03efrrow;\u61d1ownArrow;\u61d5erticalBar;\u6225n\u0300ABLRTa\u0412\u042a\u0430\u045e\u047f\u037crrow\u0180;BU\u041d\u041e\u0422\u6193ar;\u6913pArrow;\u61f5reve;\u4311eft\u02d2\u043a\0\u0446\0\u0450ightVector;\u6950eeVector;\u695eector\u0100;B\u0459\u045a\u61bdar;\u6956ight\u01d4\u0467\0\u0471eeVector;\u695fector\u0100;B\u047a\u047b\u61c1ar;\u6957ee\u0100;A\u0486\u0487\u62a4rrow;\u61a7\u0100ct\u0492\u0497r;\uc000\ud835\udc9frok;\u4110\u0800NTacdfglmopqstux\u04bd\u04c0\u04c4\u04cb\u04de\u04e2\u04e7\u04ee\u04f5\u0521\u052f\u0536\u0552\u055d\u0560\u0565G;\u414aH\u803b\xd0\u40d0cute\u803b\xc9\u40c9\u0180aiy\u04d2\u04d7\u04dcron;\u411arc\u803b\xca\u40ca;\u442dot;\u4116r;\uc000\ud835\udd08rave\u803b\xc8\u40c8ement;\u6208\u0100ap\u04fa\u04fecr;\u4112ty\u0253\u0506\0\0\u0512mallSquare;\u65fberySmallSquare;\u65ab\u0100gp\u0526\u052aon;\u4118f;\uc000\ud835\udd3csilon;\u4395u\u0100ai\u053c\u0549l\u0100;T\u0542\u0543\u6a75ilde;\u6242librium;\u61cc\u0100ci\u0557\u055ar;\u6130m;\u6a73a;\u4397ml\u803b\xcb\u40cb\u0100ip\u056a\u056fsts;\u6203onentialE;\u6147\u0280cfios\u0585\u0588\u058d\u05b2\u05ccy;\u4424r;\uc000\ud835\udd09lled\u0253\u0597\0\0\u05a3mallSquare;\u65fcerySmallSquare;\u65aa\u0370\u05ba\0\u05bf\0\0\u05c4f;\uc000\ud835\udd3dAll;\u6200riertrf;\u6131c\xf2\u05cb\u0600JTabcdfgorst\u05e8\u05ec\u05ef\u05fa\u0600\u0612\u0616\u061b\u061d\u0623\u066c\u0672cy;\u4403\u803b>\u403emma\u0100;d\u05f7\u05f8\u4393;\u43dcreve;\u411e\u0180eiy\u0607\u060c\u0610dil;\u4122rc;\u411c;\u4413ot;\u4120r;\uc000\ud835\udd0a;\u62d9pf;\uc000\ud835\udd3eeater\u0300EFGLST\u0635\u0644\u064e\u0656\u065b\u0666qual\u0100;L\u063e\u063f\u6265ess;\u62dbullEqual;\u6267reater;\u6aa2ess;\u6277lantEqual;\u6a7eilde;\u6273cr;\uc000\ud835\udca2;\u626b\u0400Aacfiosu\u0685\u068b\u0696\u069b\u069e\u06aa\u06be\u06caRDcy;\u442a\u0100ct\u0690\u0694ek;\u42c7;\u405eirc;\u4124r;\u610clbertSpace;\u610b\u01f0\u06af\0\u06b2f;\u610dizontalLine;\u6500\u0100ct\u06c3\u06c5\xf2\u06a9rok;\u4126mp\u0144\u06d0\u06d8ownHum\xf0\u012fqual;\u624f\u0700EJOacdfgmnostu\u06fa\u06fe\u0703\u0707\u070e\u071a\u071e\u0721\u0728\u0744\u0778\u078b\u078f\u0795cy;\u4415lig;\u4132cy;\u4401cute\u803b\xcd\u40cd\u0100iy\u0713\u0718rc\u803b\xce\u40ce;\u4418ot;\u4130r;\u6111rave\u803b\xcc\u40cc\u0180;ap\u0720\u072f\u073f\u0100cg\u0734\u0737r;\u412ainaryI;\u6148lie\xf3\u03dd\u01f4\u0749\0\u0762\u0100;e\u074d\u074e\u622c\u0100gr\u0753\u0758ral;\u622bsection;\u62c2isible\u0100CT\u076c\u0772omma;\u6063imes;\u6062\u0180gpt\u077f\u0783\u0788on;\u412ef;\uc000\ud835\udd40a;\u4399cr;\u6110ilde;\u4128\u01eb\u079a\0\u079ecy;\u4406l\u803b\xcf\u40cf\u0280cfosu\u07ac\u07b7\u07bc\u07c2\u07d0\u0100iy\u07b1\u07b5rc;\u4134;\u4419r;\uc000\ud835\udd0dpf;\uc000\ud835\udd41\u01e3\u07c7\0\u07ccr;\uc000\ud835\udca5rcy;\u4408kcy;\u4404\u0380HJacfos\u07e4\u07e8\u07ec\u07f1\u07fd\u0802\u0808cy;\u4425cy;\u440cppa;\u439a\u0100ey\u07f6\u07fbdil;\u4136;\u441ar;\uc000\ud835\udd0epf;\uc000\ud835\udd42cr;\uc000\ud835\udca6\u0580JTaceflmost\u0825\u0829\u082c\u0850\u0863\u09b3\u09b8\u09c7\u09cd\u0a37\u0a47cy;\u4409\u803b<\u403c\u0280cmnpr\u0837\u083c\u0841\u0844\u084dute;\u4139bda;\u439bg;\u67ealacetrf;\u6112r;\u619e\u0180aey\u0857\u085c\u0861ron;\u413ddil;\u413b;\u441b\u0100fs\u0868\u0970t\u0500ACDFRTUVar\u087e\u08a9\u08b1\u08e0\u08e6\u08fc\u092f\u095b\u0390\u096a\u0100nr\u0883\u088fgleBracket;\u67e8row\u0180;BR\u0899\u089a\u089e\u6190ar;\u61e4ightArrow;\u61c6eiling;\u6308o\u01f5\u08b7\0\u08c3bleBracket;\u67e6n\u01d4\u08c8\0\u08d2eeVector;\u6961ector\u0100;B\u08db\u08dc\u61c3ar;\u6959loor;\u630aight\u0100AV\u08ef\u08f5rrow;\u6194ector;\u694e\u0100er\u0901\u0917e\u0180;AV\u0909\u090a\u0910\u62a3rrow;\u61a4ector;\u695aiangle\u0180;BE\u0924\u0925\u0929\u62b2ar;\u69cfqual;\u62b4p\u0180DTV\u0937\u0942\u094cownVector;\u6951eeVector;\u6960ector\u0100;B\u0956\u0957\u61bfar;\u6958ector\u0100;B\u0965\u0966\u61bcar;\u6952ight\xe1\u039cs\u0300EFGLST\u097e\u098b\u0995\u099d\u09a2\u09adqualGreater;\u62daullEqual;\u6266reater;\u6276ess;\u6aa1lantEqual;\u6a7dilde;\u6272r;\uc000\ud835\udd0f\u0100;e\u09bd\u09be\u62d8ftarrow;\u61daidot;\u413f\u0180npw\u09d4\u0a16\u0a1bg\u0200LRlr\u09de\u09f7\u0a02\u0a10eft\u0100AR\u09e6\u09ecrrow;\u67f5ightArrow;\u67f7ightArrow;\u67f6eft\u0100ar\u03b3\u0a0aight\xe1\u03bfight\xe1\u03caf;\uc000\ud835\udd43er\u0100LR\u0a22\u0a2ceftArrow;\u6199ightArrow;\u6198\u0180cht\u0a3e\u0a40\u0a42\xf2\u084c;\u61b0rok;\u4141;\u626a\u0400acefiosu\u0a5a\u0a5d\u0a60\u0a77\u0a7c\u0a85\u0a8b\u0a8ep;\u6905y;\u441c\u0100dl\u0a65\u0a6fiumSpace;\u605flintrf;\u6133r;\uc000\ud835\udd10nusPlus;\u6213pf;\uc000\ud835\udd44c\xf2\u0a76;\u439c\u0480Jacefostu\u0aa3\u0aa7\u0aad\u0ac0\u0b14\u0b19\u0d91\u0d97\u0d9ecy;\u440acute;\u4143\u0180aey\u0ab4\u0ab9\u0aberon;\u4147dil;\u4145;\u441d\u0180gsw\u0ac7\u0af0\u0b0eative\u0180MTV\u0ad3\u0adf\u0ae8ediumSpace;\u600bhi\u0100cn\u0ae6\u0ad8\xeb\u0ad9eryThi\xee\u0ad9ted\u0100GL\u0af8\u0b06reaterGreate\xf2\u0673essLes\xf3\u0a48Line;\u400ar;\uc000\ud835\udd11\u0200Bnpt\u0b22\u0b28\u0b37\u0b3areak;\u6060BreakingSpace;\u40a0f;\u6115\u0680;CDEGHLNPRSTV\u0b55\u0b56\u0b6a\u0b7c\u0ba1\u0beb\u0c04\u0c5e\u0c84\u0ca6\u0cd8\u0d61\u0d85\u6aec\u0100ou\u0b5b\u0b64ngruent;\u6262pCap;\u626doubleVerticalBar;\u6226\u0180lqx\u0b83\u0b8a\u0b9bement;\u6209ual\u0100;T\u0b92\u0b93\u6260ilde;\uc000\u2242\u0338ists;\u6204reater\u0380;EFGLST\u0bb6\u0bb7\u0bbd\u0bc9\u0bd3\u0bd8\u0be5\u626fqual;\u6271ullEqual;\uc000\u2267\u0338reater;\uc000\u226b\u0338ess;\u6279lantEqual;\uc000\u2a7e\u0338ilde;\u6275ump\u0144\u0bf2\u0bfdownHump;\uc000\u224e\u0338qual;\uc000\u224f\u0338e\u0100fs\u0c0a\u0c27tTriangle\u0180;BE\u0c1a\u0c1b\u0c21\u62eaar;\uc000\u29cf\u0338qual;\u62ecs\u0300;EGLST\u0c35\u0c36\u0c3c\u0c44\u0c4b\u0c58\u626equal;\u6270reater;\u6278ess;\uc000\u226a\u0338lantEqual;\uc000\u2a7d\u0338ilde;\u6274ested\u0100GL\u0c68\u0c79reaterGreater;\uc000\u2aa2\u0338essLess;\uc000\u2aa1\u0338recedes\u0180;ES\u0c92\u0c93\u0c9b\u6280qual;\uc000\u2aaf\u0338lantEqual;\u62e0\u0100ei\u0cab\u0cb9verseElement;\u620cghtTriangle\u0180;BE\u0ccb\u0ccc\u0cd2\u62ebar;\uc000\u29d0\u0338qual;\u62ed\u0100qu\u0cdd\u0d0cuareSu\u0100bp\u0ce8\u0cf9set\u0100;E\u0cf0\u0cf3\uc000\u228f\u0338qual;\u62e2erset\u0100;E\u0d03\u0d06\uc000\u2290\u0338qual;\u62e3\u0180bcp\u0d13\u0d24\u0d4eset\u0100;E\u0d1b\u0d1e\uc000\u2282\u20d2qual;\u6288ceeds\u0200;EST\u0d32\u0d33\u0d3b\u0d46\u6281qual;\uc000\u2ab0\u0338lantEqual;\u62e1ilde;\uc000\u227f\u0338erset\u0100;E\u0d58\u0d5b\uc000\u2283\u20d2qual;\u6289ilde\u0200;EFT\u0d6e\u0d6f\u0d75\u0d7f\u6241qual;\u6244ullEqual;\u6247ilde;\u6249erticalBar;\u6224cr;\uc000\ud835\udca9ilde\u803b\xd1\u40d1;\u439d\u0700Eacdfgmoprstuv\u0dbd\u0dc2\u0dc9\u0dd5\u0ddb\u0de0\u0de7\u0dfc\u0e02\u0e20\u0e22\u0e32\u0e3f\u0e44lig;\u4152cute\u803b\xd3\u40d3\u0100iy\u0dce\u0dd3rc\u803b\xd4\u40d4;\u441eblac;\u4150r;\uc000\ud835\udd12rave\u803b\xd2\u40d2\u0180aei\u0dee\u0df2\u0df6cr;\u414cga;\u43a9cron;\u439fpf;\uc000\ud835\udd46enCurly\u0100DQ\u0e0e\u0e1aoubleQuote;\u601cuote;\u6018;\u6a54\u0100cl\u0e27\u0e2cr;\uc000\ud835\udcaaash\u803b\xd8\u40d8i\u016c\u0e37\u0e3cde\u803b\xd5\u40d5es;\u6a37ml\u803b\xd6\u40d6er\u0100BP\u0e4b\u0e60\u0100ar\u0e50\u0e53r;\u603eac\u0100ek\u0e5a\u0e5c;\u63deet;\u63b4arenthesis;\u63dc\u0480acfhilors\u0e7f\u0e87\u0e8a\u0e8f\u0e92\u0e94\u0e9d\u0eb0\u0efcrtialD;\u6202y;\u441fr;\uc000\ud835\udd13i;\u43a6;\u43a0usMinus;\u40b1\u0100ip\u0ea2\u0eadncareplan\xe5\u069df;\u6119\u0200;eio\u0eb9\u0eba\u0ee0\u0ee4\u6abbcedes\u0200;EST\u0ec8\u0ec9\u0ecf\u0eda\u627aqual;\u6aaflantEqual;\u627cilde;\u627eme;\u6033\u0100dp\u0ee9\u0eeeuct;\u620fortion\u0100;a\u0225\u0ef9l;\u621d\u0100ci\u0f01\u0f06r;\uc000\ud835\udcab;\u43a8\u0200Ufos\u0f11\u0f16\u0f1b\u0f1fOT\u803b\"\u4022r;\uc000\ud835\udd14pf;\u611acr;\uc000\ud835\udcac\u0600BEacefhiorsu\u0f3e\u0f43\u0f47\u0f60\u0f73\u0fa7\u0faa\u0fad\u1096\u10a9\u10b4\u10bearr;\u6910G\u803b\xae\u40ae\u0180cnr\u0f4e\u0f53\u0f56ute;\u4154g;\u67ebr\u0100;t\u0f5c\u0f5d\u61a0l;\u6916\u0180aey\u0f67\u0f6c\u0f71ron;\u4158dil;\u4156;\u4420\u0100;v\u0f78\u0f79\u611cerse\u0100EU\u0f82\u0f99\u0100lq\u0f87\u0f8eement;\u620builibrium;\u61cbpEquilibrium;\u696fr\xbb\u0f79o;\u43a1ght\u0400ACDFTUVa\u0fc1\u0feb\u0ff3\u1022\u1028\u105b\u1087\u03d8\u0100nr\u0fc6\u0fd2gleBracket;\u67e9row\u0180;BL\u0fdc\u0fdd\u0fe1\u6192ar;\u61e5eftArrow;\u61c4eiling;\u6309o\u01f5\u0ff9\0\u1005bleBracket;\u67e7n\u01d4\u100a\0\u1014eeVector;\u695dector\u0100;B\u101d\u101e\u61c2ar;\u6955loor;\u630b\u0100er\u102d\u1043e\u0180;AV\u1035\u1036\u103c\u62a2rrow;\u61a6ector;\u695biangle\u0180;BE\u1050\u1051\u1055\u62b3ar;\u69d0qual;\u62b5p\u0180DTV\u1063\u106e\u1078ownVector;\u694feeVector;\u695cector\u0100;B\u1082\u1083\u61bear;\u6954ector\u0100;B\u1091\u1092\u61c0ar;\u6953\u0100pu\u109b\u109ef;\u611dndImplies;\u6970ightarrow;\u61db\u0100ch\u10b9\u10bcr;\u611b;\u61b1leDelayed;\u69f4\u0680HOacfhimoqstu\u10e4\u10f1\u10f7\u10fd\u1119\u111e\u1151\u1156\u1161\u1167\u11b5\u11bb\u11bf\u0100Cc\u10e9\u10eeHcy;\u4429y;\u4428FTcy;\u442ccute;\u415a\u0280;aeiy\u1108\u1109\u110e\u1113\u1117\u6abcron;\u4160dil;\u415erc;\u415c;\u4421r;\uc000\ud835\udd16ort\u0200DLRU\u112a\u1134\u113e\u1149ownArrow\xbb\u041eeftArrow\xbb\u089aightArrow\xbb\u0fddpArrow;\u6191gma;\u43a3allCircle;\u6218pf;\uc000\ud835\udd4a\u0272\u116d\0\0\u1170t;\u621aare\u0200;ISU\u117b\u117c\u1189\u11af\u65a1ntersection;\u6293u\u0100bp\u118f\u119eset\u0100;E\u1197\u1198\u628fqual;\u6291erset\u0100;E\u11a8\u11a9\u6290qual;\u6292nion;\u6294cr;\uc000\ud835\udcaear;\u62c6\u0200bcmp\u11c8\u11db\u1209\u120b\u0100;s\u11cd\u11ce\u62d0et\u0100;E\u11cd\u11d5qual;\u6286\u0100ch\u11e0\u1205eeds\u0200;EST\u11ed\u11ee\u11f4\u11ff\u627bqual;\u6ab0lantEqual;\u627dilde;\u627fTh\xe1\u0f8c;\u6211\u0180;es\u1212\u1213\u1223\u62d1rset\u0100;E\u121c\u121d\u6283qual;\u6287et\xbb\u1213\u0580HRSacfhiors\u123e\u1244\u1249\u1255\u125e\u1271\u1276\u129f\u12c2\u12c8\u12d1ORN\u803b\xde\u40deADE;\u6122\u0100Hc\u124e\u1252cy;\u440by;\u4426\u0100bu\u125a\u125c;\u4009;\u43a4\u0180aey\u1265\u126a\u126fron;\u4164dil;\u4162;\u4422r;\uc000\ud835\udd17\u0100ei\u127b\u1289\u01f2\u1280\0\u1287efore;\u6234a;\u4398\u0100cn\u128e\u1298kSpace;\uc000\u205f\u200aSpace;\u6009lde\u0200;EFT\u12ab\u12ac\u12b2\u12bc\u623cqual;\u6243ullEqual;\u6245ilde;\u6248pf;\uc000\ud835\udd4bipleDot;\u60db\u0100ct\u12d6\u12dbr;\uc000\ud835\udcafrok;\u4166\u0ae1\u12f7\u130e\u131a\u1326\0\u132c\u1331\0\0\0\0\0\u1338\u133d\u1377\u1385\0\u13ff\u1404\u140a\u1410\u0100cr\u12fb\u1301ute\u803b\xda\u40dar\u0100;o\u1307\u1308\u619fcir;\u6949r\u01e3\u1313\0\u1316y;\u440eve;\u416c\u0100iy\u131e\u1323rc\u803b\xdb\u40db;\u4423blac;\u4170r;\uc000\ud835\udd18rave\u803b\xd9\u40d9acr;\u416a\u0100di\u1341\u1369er\u0100BP\u1348\u135d\u0100ar\u134d\u1350r;\u405fac\u0100ek\u1357\u1359;\u63dfet;\u63b5arenthesis;\u63ddon\u0100;P\u1370\u1371\u62c3lus;\u628e\u0100gp\u137b\u137fon;\u4172f;\uc000\ud835\udd4c\u0400ADETadps\u1395\u13ae\u13b8\u13c4\u03e8\u13d2\u13d7\u13f3rrow\u0180;BD\u1150\u13a0\u13a4ar;\u6912ownArrow;\u61c5ownArrow;\u6195quilibrium;\u696eee\u0100;A\u13cb\u13cc\u62a5rrow;\u61a5own\xe1\u03f3er\u0100LR\u13de\u13e8eftArrow;\u6196ightArrow;\u6197i\u0100;l\u13f9\u13fa\u43d2on;\u43a5ing;\u416ecr;\uc000\ud835\udcb0ilde;\u4168ml\u803b\xdc\u40dc\u0480Dbcdefosv\u1427\u142c\u1430\u1433\u143e\u1485\u148a\u1490\u1496ash;\u62abar;\u6aeby;\u4412ash\u0100;l\u143b\u143c\u62a9;\u6ae6\u0100er\u1443\u1445;\u62c1\u0180bty\u144c\u1450\u147aar;\u6016\u0100;i\u144f\u1455cal\u0200BLST\u1461\u1465\u146a\u1474ar;\u6223ine;\u407ceparator;\u6758ilde;\u6240ThinSpace;\u600ar;\uc000\ud835\udd19pf;\uc000\ud835\udd4dcr;\uc000\ud835\udcb1dash;\u62aa\u0280cefos\u14a7\u14ac\u14b1\u14b6\u14bcirc;\u4174dge;\u62c0r;\uc000\ud835\udd1apf;\uc000\ud835\udd4ecr;\uc000\ud835\udcb2\u0200fios\u14cb\u14d0\u14d2\u14d8r;\uc000\ud835\udd1b;\u439epf;\uc000\ud835\udd4fcr;\uc000\ud835\udcb3\u0480AIUacfosu\u14f1\u14f5\u14f9\u14fd\u1504\u150f\u1514\u151a\u1520cy;\u442fcy;\u4407cy;\u442ecute\u803b\xdd\u40dd\u0100iy\u1509\u150drc;\u4176;\u442br;\uc000\ud835\udd1cpf;\uc000\ud835\udd50cr;\uc000\ud835\udcb4ml;\u4178\u0400Hacdefos\u1535\u1539\u153f\u154b\u154f\u155d\u1560\u1564cy;\u4416cute;\u4179\u0100ay\u1544\u1549ron;\u417d;\u4417ot;\u417b\u01f2\u1554\0\u155boWidt\xe8\u0ad9a;\u4396r;\u6128pf;\u6124cr;\uc000\ud835\udcb5\u0be1\u1583\u158a\u1590\0\u15b0\u15b6\u15bf\0\0\0\0\u15c6\u15db\u15eb\u165f\u166d\0\u1695\u169b\u16b2\u16b9\0\u16becute\u803b\xe1\u40e1reve;\u4103\u0300;Ediuy\u159c\u159d\u15a1\u15a3\u15a8\u15ad\u623e;\uc000\u223e\u0333;\u623frc\u803b\xe2\u40e2te\u80bb\xb4\u0306;\u4430lig\u803b\xe6\u40e6\u0100;r\xb2\u15ba;\uc000\ud835\udd1erave\u803b\xe0\u40e0\u0100ep\u15ca\u15d6\u0100fp\u15cf\u15d4sym;\u6135\xe8\u15d3ha;\u43b1\u0100ap\u15dfc\u0100cl\u15e4\u15e7r;\u4101g;\u6a3f\u0264\u15f0\0\0\u160a\u0280;adsv\u15fa\u15fb\u15ff\u1601\u1607\u6227nd;\u6a55;\u6a5clope;\u6a58;\u6a5a\u0380;elmrsz\u1618\u1619\u161b\u161e\u163f\u164f\u1659\u6220;\u69a4e\xbb\u1619sd\u0100;a\u1625\u1626\u6221\u0461\u1630\u1632\u1634\u1636\u1638\u163a\u163c\u163e;\u69a8;\u69a9;\u69aa;\u69ab;\u69ac;\u69ad;\u69ae;\u69aft\u0100;v\u1645\u1646\u621fb\u0100;d\u164c\u164d\u62be;\u699d\u0100pt\u1654\u1657h;\u6222\xbb\xb9arr;\u637c\u0100gp\u1663\u1667on;\u4105f;\uc000\ud835\udd52\u0380;Eaeiop\u12c1\u167b\u167d\u1682\u1684\u1687\u168a;\u6a70cir;\u6a6f;\u624ad;\u624bs;\u4027rox\u0100;e\u12c1\u1692\xf1\u1683ing\u803b\xe5\u40e5\u0180cty\u16a1\u16a6\u16a8r;\uc000\ud835\udcb6;\u402amp\u0100;e\u12c1\u16af\xf1\u0288ilde\u803b\xe3\u40e3ml\u803b\xe4\u40e4\u0100ci\u16c2\u16c8onin\xf4\u0272nt;\u6a11\u0800Nabcdefiklnoprsu\u16ed\u16f1\u1730\u173c\u1743\u1748\u1778\u177d\u17e0\u17e6\u1839\u1850\u170d\u193d\u1948\u1970ot;\u6aed\u0100cr\u16f6\u171ek\u0200ceps\u1700\u1705\u170d\u1713ong;\u624cpsilon;\u43f6rime;\u6035im\u0100;e\u171a\u171b\u623dq;\u62cd\u0176\u1722\u1726ee;\u62bded\u0100;g\u172c\u172d\u6305e\xbb\u172drk\u0100;t\u135c\u1737brk;\u63b6\u0100oy\u1701\u1741;\u4431quo;\u601e\u0280cmprt\u1753\u175b\u1761\u1764\u1768aus\u0100;e\u010a\u0109ptyv;\u69b0s\xe9\u170cno\xf5\u0113\u0180ahw\u176f\u1771\u1773;\u43b2;\u6136een;\u626cr;\uc000\ud835\udd1fg\u0380costuvw\u178d\u179d\u17b3\u17c1\u17d5\u17db\u17de\u0180aiu\u1794\u1796\u179a\xf0\u0760rc;\u65efp\xbb\u1371\u0180dpt\u17a4\u17a8\u17adot;\u6a00lus;\u6a01imes;\u6a02\u0271\u17b9\0\0\u17becup;\u6a06ar;\u6605riangle\u0100du\u17cd\u17d2own;\u65bdp;\u65b3plus;\u6a04e\xe5\u1444\xe5\u14adarow;\u690d\u0180ako\u17ed\u1826\u1835\u0100cn\u17f2\u1823k\u0180lst\u17fa\u05ab\u1802ozenge;\u69ebriangle\u0200;dlr\u1812\u1813\u1818\u181d\u65b4own;\u65beeft;\u65c2ight;\u65b8k;\u6423\u01b1\u182b\0\u1833\u01b2\u182f\0\u1831;\u6592;\u65914;\u6593ck;\u6588\u0100eo\u183e\u184d\u0100;q\u1843\u1846\uc000=\u20e5uiv;\uc000\u2261\u20e5t;\u6310\u0200ptwx\u1859\u185e\u1867\u186cf;\uc000\ud835\udd53\u0100;t\u13cb\u1863om\xbb\u13cctie;\u62c8\u0600DHUVbdhmptuv\u1885\u1896\u18aa\u18bb\u18d7\u18db\u18ec\u18ff\u1905\u190a\u1910\u1921\u0200LRlr\u188e\u1890\u1892\u1894;\u6557;\u6554;\u6556;\u6553\u0280;DUdu\u18a1\u18a2\u18a4\u18a6\u18a8\u6550;\u6566;\u6569;\u6564;\u6567\u0200LRlr\u18b3\u18b5\u18b7\u18b9;\u655d;\u655a;\u655c;\u6559\u0380;HLRhlr\u18ca\u18cb\u18cd\u18cf\u18d1\u18d3\u18d5\u6551;\u656c;\u6563;\u6560;\u656b;\u6562;\u655fox;\u69c9\u0200LRlr\u18e4\u18e6\u18e8\u18ea;\u6555;\u6552;\u6510;\u650c\u0280;DUdu\u06bd\u18f7\u18f9\u18fb\u18fd;\u6565;\u6568;\u652c;\u6534inus;\u629flus;\u629eimes;\u62a0\u0200LRlr\u1919\u191b\u191d\u191f;\u655b;\u6558;\u6518;\u6514\u0380;HLRhlr\u1930\u1931\u1933\u1935\u1937\u1939\u193b\u6502;\u656a;\u6561;\u655e;\u653c;\u6524;\u651c\u0100ev\u0123\u1942bar\u803b\xa6\u40a6\u0200ceio\u1951\u1956\u195a\u1960r;\uc000\ud835\udcb7mi;\u604fm\u0100;e\u171a\u171cl\u0180;bh\u1968\u1969\u196b\u405c;\u69c5sub;\u67c8\u016c\u1974\u197el\u0100;e\u1979\u197a\u6022t\xbb\u197ap\u0180;Ee\u012f\u1985\u1987;\u6aae\u0100;q\u06dc\u06db\u0ce1\u19a7\0\u19e8\u1a11\u1a15\u1a32\0\u1a37\u1a50\0\0\u1ab4\0\0\u1ac1\0\0\u1b21\u1b2e\u1b4d\u1b52\0\u1bfd\0\u1c0c\u0180cpr\u19ad\u19b2\u19ddute;\u4107\u0300;abcds\u19bf\u19c0\u19c4\u19ca\u19d5\u19d9\u6229nd;\u6a44rcup;\u6a49\u0100au\u19cf\u19d2p;\u6a4bp;\u6a47ot;\u6a40;\uc000\u2229\ufe00\u0100eo\u19e2\u19e5t;\u6041\xee\u0693\u0200aeiu\u19f0\u19fb\u1a01\u1a05\u01f0\u19f5\0\u19f8s;\u6a4don;\u410ddil\u803b\xe7\u40e7rc;\u4109ps\u0100;s\u1a0c\u1a0d\u6a4cm;\u6a50ot;\u410b\u0180dmn\u1a1b\u1a20\u1a26il\u80bb\xb8\u01adptyv;\u69b2t\u8100\xa2;e\u1a2d\u1a2e\u40a2r\xe4\u01b2r;\uc000\ud835\udd20\u0180cei\u1a3d\u1a40\u1a4dy;\u4447ck\u0100;m\u1a47\u1a48\u6713ark\xbb\u1a48;\u43c7r\u0380;Ecefms\u1a5f\u1a60\u1a62\u1a6b\u1aa4\u1aaa\u1aae\u65cb;\u69c3\u0180;el\u1a69\u1a6a\u1a6d\u42c6q;\u6257e\u0261\u1a74\0\0\u1a88rrow\u0100lr\u1a7c\u1a81eft;\u61baight;\u61bb\u0280RSacd\u1a92\u1a94\u1a96\u1a9a\u1a9f\xbb\u0f47;\u64c8st;\u629birc;\u629aash;\u629dnint;\u6a10id;\u6aefcir;\u69c2ubs\u0100;u\u1abb\u1abc\u6663it\xbb\u1abc\u02ec\u1ac7\u1ad4\u1afa\0\u1b0aon\u0100;e\u1acd\u1ace\u403a\u0100;q\xc7\xc6\u026d\u1ad9\0\0\u1ae2a\u0100;t\u1ade\u1adf\u402c;\u4040\u0180;fl\u1ae8\u1ae9\u1aeb\u6201\xee\u1160e\u0100mx\u1af1\u1af6ent\xbb\u1ae9e\xf3\u024d\u01e7\u1afe\0\u1b07\u0100;d\u12bb\u1b02ot;\u6a6dn\xf4\u0246\u0180fry\u1b10\u1b14\u1b17;\uc000\ud835\udd54o\xe4\u0254\u8100\xa9;s\u0155\u1b1dr;\u6117\u0100ao\u1b25\u1b29rr;\u61b5ss;\u6717\u0100cu\u1b32\u1b37r;\uc000\ud835\udcb8\u0100bp\u1b3c\u1b44\u0100;e\u1b41\u1b42\u6acf;\u6ad1\u0100;e\u1b49\u1b4a\u6ad0;\u6ad2dot;\u62ef\u0380delprvw\u1b60\u1b6c\u1b77\u1b82\u1bac\u1bd4\u1bf9arr\u0100lr\u1b68\u1b6a;\u6938;\u6935\u0270\u1b72\0\0\u1b75r;\u62dec;\u62dfarr\u0100;p\u1b7f\u1b80\u61b6;\u693d\u0300;bcdos\u1b8f\u1b90\u1b96\u1ba1\u1ba5\u1ba8\u622arcap;\u6a48\u0100au\u1b9b\u1b9ep;\u6a46p;\u6a4aot;\u628dr;\u6a45;\uc000\u222a\ufe00\u0200alrv\u1bb5\u1bbf\u1bde\u1be3rr\u0100;m\u1bbc\u1bbd\u61b7;\u693cy\u0180evw\u1bc7\u1bd4\u1bd8q\u0270\u1bce\0\0\u1bd2re\xe3\u1b73u\xe3\u1b75ee;\u62ceedge;\u62cfen\u803b\xa4\u40a4earrow\u0100lr\u1bee\u1bf3eft\xbb\u1b80ight\xbb\u1bbde\xe4\u1bdd\u0100ci\u1c01\u1c07onin\xf4\u01f7nt;\u6231lcty;\u632d\u0980AHabcdefhijlorstuwz\u1c38\u1c3b\u1c3f\u1c5d\u1c69\u1c75\u1c8a\u1c9e\u1cac\u1cb7\u1cfb\u1cff\u1d0d\u1d7b\u1d91\u1dab\u1dbb\u1dc6\u1dcdr\xf2\u0381ar;\u6965\u0200glrs\u1c48\u1c4d\u1c52\u1c54ger;\u6020eth;\u6138\xf2\u1133h\u0100;v\u1c5a\u1c5b\u6010\xbb\u090a\u016b\u1c61\u1c67arow;\u690fa\xe3\u0315\u0100ay\u1c6e\u1c73ron;\u410f;\u4434\u0180;ao\u0332\u1c7c\u1c84\u0100gr\u02bf\u1c81r;\u61catseq;\u6a77\u0180glm\u1c91\u1c94\u1c98\u803b\xb0\u40b0ta;\u43b4ptyv;\u69b1\u0100ir\u1ca3\u1ca8sht;\u697f;\uc000\ud835\udd21ar\u0100lr\u1cb3\u1cb5\xbb\u08dc\xbb\u101e\u0280aegsv\u1cc2\u0378\u1cd6\u1cdc\u1ce0m\u0180;os\u0326\u1cca\u1cd4nd\u0100;s\u0326\u1cd1uit;\u6666amma;\u43ddin;\u62f2\u0180;io\u1ce7\u1ce8\u1cf8\u40f7de\u8100\xf7;o\u1ce7\u1cf0ntimes;\u62c7n\xf8\u1cf7cy;\u4452c\u026f\u1d06\0\0\u1d0arn;\u631eop;\u630d\u0280lptuw\u1d18\u1d1d\u1d22\u1d49\u1d55lar;\u4024f;\uc000\ud835\udd55\u0280;emps\u030b\u1d2d\u1d37\u1d3d\u1d42q\u0100;d\u0352\u1d33ot;\u6251inus;\u6238lus;\u6214quare;\u62a1blebarwedg\xe5\xfan\u0180adh\u112e\u1d5d\u1d67ownarrow\xf3\u1c83arpoon\u0100lr\u1d72\u1d76ef\xf4\u1cb4igh\xf4\u1cb6\u0162\u1d7f\u1d85karo\xf7\u0f42\u026f\u1d8a\0\0\u1d8ern;\u631fop;\u630c\u0180cot\u1d98\u1da3\u1da6\u0100ry\u1d9d\u1da1;\uc000\ud835\udcb9;\u4455l;\u69f6rok;\u4111\u0100dr\u1db0\u1db4ot;\u62f1i\u0100;f\u1dba\u1816\u65bf\u0100ah\u1dc0\u1dc3r\xf2\u0429a\xf2\u0fa6angle;\u69a6\u0100ci\u1dd2\u1dd5y;\u445fgrarr;\u67ff\u0900Dacdefglmnopqrstux\u1e01\u1e09\u1e19\u1e38\u0578\u1e3c\u1e49\u1e61\u1e7e\u1ea5\u1eaf\u1ebd\u1ee1\u1f2a\u1f37\u1f44\u1f4e\u1f5a\u0100Do\u1e06\u1d34o\xf4\u1c89\u0100cs\u1e0e\u1e14ute\u803b\xe9\u40e9ter;\u6a6e\u0200aioy\u1e22\u1e27\u1e31\u1e36ron;\u411br\u0100;c\u1e2d\u1e2e\u6256\u803b\xea\u40ealon;\u6255;\u444dot;\u4117\u0100Dr\u1e41\u1e45ot;\u6252;\uc000\ud835\udd22\u0180;rs\u1e50\u1e51\u1e57\u6a9aave\u803b\xe8\u40e8\u0100;d\u1e5c\u1e5d\u6a96ot;\u6a98\u0200;ils\u1e6a\u1e6b\u1e72\u1e74\u6a99nters;\u63e7;\u6113\u0100;d\u1e79\u1e7a\u6a95ot;\u6a97\u0180aps\u1e85\u1e89\u1e97cr;\u4113ty\u0180;sv\u1e92\u1e93\u1e95\u6205et\xbb\u1e93p\u01001;\u1e9d\u1ea4\u0133\u1ea1\u1ea3;\u6004;\u6005\u6003\u0100gs\u1eaa\u1eac;\u414bp;\u6002\u0100gp\u1eb4\u1eb8on;\u4119f;\uc000\ud835\udd56\u0180als\u1ec4\u1ece\u1ed2r\u0100;s\u1eca\u1ecb\u62d5l;\u69e3us;\u6a71i\u0180;lv\u1eda\u1edb\u1edf\u43b5on\xbb\u1edb;\u43f5\u0200csuv\u1eea\u1ef3\u1f0b\u1f23\u0100io\u1eef\u1e31rc\xbb\u1e2e\u0269\u1ef9\0\0\u1efb\xed\u0548ant\u0100gl\u1f02\u1f06tr\xbb\u1e5dess\xbb\u1e7a\u0180aei\u1f12\u1f16\u1f1als;\u403dst;\u625fv\u0100;D\u0235\u1f20D;\u6a78parsl;\u69e5\u0100Da\u1f2f\u1f33ot;\u6253rr;\u6971\u0180cdi\u1f3e\u1f41\u1ef8r;\u612fo\xf4\u0352\u0100ah\u1f49\u1f4b;\u43b7\u803b\xf0\u40f0\u0100mr\u1f53\u1f57l\u803b\xeb\u40ebo;\u60ac\u0180cip\u1f61\u1f64\u1f67l;\u4021s\xf4\u056e\u0100eo\u1f6c\u1f74ctatio\xee\u0559nential\xe5\u0579\u09e1\u1f92\0\u1f9e\0\u1fa1\u1fa7\0\0\u1fc6\u1fcc\0\u1fd3\0\u1fe6\u1fea\u2000\0\u2008\u205allingdotse\xf1\u1e44y;\u4444male;\u6640\u0180ilr\u1fad\u1fb3\u1fc1lig;\u8000\ufb03\u0269\u1fb9\0\0\u1fbdg;\u8000\ufb00ig;\u8000\ufb04;\uc000\ud835\udd23lig;\u8000\ufb01lig;\uc000fj\u0180alt\u1fd9\u1fdc\u1fe1t;\u666dig;\u8000\ufb02ns;\u65b1of;\u4192\u01f0\u1fee\0\u1ff3f;\uc000\ud835\udd57\u0100ak\u05bf\u1ff7\u0100;v\u1ffc\u1ffd\u62d4;\u6ad9artint;\u6a0d\u0100ao\u200c\u2055\u0100cs\u2011\u2052\u03b1\u201a\u2030\u2038\u2045\u2048\0\u2050\u03b2\u2022\u2025\u2027\u202a\u202c\0\u202e\u803b\xbd\u40bd;\u6153\u803b\xbc\u40bc;\u6155;\u6159;\u615b\u01b3\u2034\0\u2036;\u6154;\u6156\u02b4\u203e\u2041\0\0\u2043\u803b\xbe\u40be;\u6157;\u615c5;\u6158\u01b6\u204c\0\u204e;\u615a;\u615d8;\u615el;\u6044wn;\u6322cr;\uc000\ud835\udcbb\u0880Eabcdefgijlnorstv\u2082\u2089\u209f\u20a5\u20b0\u20b4\u20f0\u20f5\u20fa\u20ff\u2103\u2112\u2138\u0317\u213e\u2152\u219e\u0100;l\u064d\u2087;\u6a8c\u0180cmp\u2090\u2095\u209dute;\u41f5ma\u0100;d\u209c\u1cda\u43b3;\u6a86reve;\u411f\u0100iy\u20aa\u20aerc;\u411d;\u4433ot;\u4121\u0200;lqs\u063e\u0642\u20bd\u20c9\u0180;qs\u063e\u064c\u20c4lan\xf4\u0665\u0200;cdl\u0665\u20d2\u20d5\u20e5c;\u6aa9ot\u0100;o\u20dc\u20dd\u6a80\u0100;l\u20e2\u20e3\u6a82;\u6a84\u0100;e\u20ea\u20ed\uc000\u22db\ufe00s;\u6a94r;\uc000\ud835\udd24\u0100;g\u0673\u061bmel;\u6137cy;\u4453\u0200;Eaj\u065a\u210c\u210e\u2110;\u6a92;\u6aa5;\u6aa4\u0200Eaes\u211b\u211d\u2129\u2134;\u6269p\u0100;p\u2123\u2124\u6a8arox\xbb\u2124\u0100;q\u212e\u212f\u6a88\u0100;q\u212e\u211bim;\u62e7pf;\uc000\ud835\udd58\u0100ci\u2143\u2146r;\u610am\u0180;el\u066b\u214e\u2150;\u6a8e;\u6a90\u8300>;cdlqr\u05ee\u2160\u216a\u216e\u2173\u2179\u0100ci\u2165\u2167;\u6aa7r;\u6a7aot;\u62d7Par;\u6995uest;\u6a7c\u0280adels\u2184\u216a\u2190\u0656\u219b\u01f0\u2189\0\u218epro\xf8\u209er;\u6978q\u0100lq\u063f\u2196les\xf3\u2088i\xed\u066b\u0100en\u21a3\u21adrtneqq;\uc000\u2269\ufe00\xc5\u21aa\u0500Aabcefkosy\u21c4\u21c7\u21f1\u21f5\u21fa\u2218\u221d\u222f\u2268\u227dr\xf2\u03a0\u0200ilmr\u21d0\u21d4\u21d7\u21dbrs\xf0\u1484f\xbb\u2024il\xf4\u06a9\u0100dr\u21e0\u21e4cy;\u444a\u0180;cw\u08f4\u21eb\u21efir;\u6948;\u61adar;\u610firc;\u4125\u0180alr\u2201\u220e\u2213rts\u0100;u\u2209\u220a\u6665it\xbb\u220alip;\u6026con;\u62b9r;\uc000\ud835\udd25s\u0100ew\u2223\u2229arow;\u6925arow;\u6926\u0280amopr\u223a\u223e\u2243\u225e\u2263rr;\u61fftht;\u623bk\u0100lr\u2249\u2253eftarrow;\u61a9ightarrow;\u61aaf;\uc000\ud835\udd59bar;\u6015\u0180clt\u226f\u2274\u2278r;\uc000\ud835\udcbdas\xe8\u21f4rok;\u4127\u0100bp\u2282\u2287ull;\u6043hen\xbb\u1c5b\u0ae1\u22a3\0\u22aa\0\u22b8\u22c5\u22ce\0\u22d5\u22f3\0\0\u22f8\u2322\u2367\u2362\u237f\0\u2386\u23aa\u23b4cute\u803b\xed\u40ed\u0180;iy\u0771\u22b0\u22b5rc\u803b\xee\u40ee;\u4438\u0100cx\u22bc\u22bfy;\u4435cl\u803b\xa1\u40a1\u0100fr\u039f\u22c9;\uc000\ud835\udd26rave\u803b\xec\u40ec\u0200;ino\u073e\u22dd\u22e9\u22ee\u0100in\u22e2\u22e6nt;\u6a0ct;\u622dfin;\u69dcta;\u6129lig;\u4133\u0180aop\u22fe\u231a\u231d\u0180cgt\u2305\u2308\u2317r;\u412b\u0180elp\u071f\u230f\u2313in\xe5\u078ear\xf4\u0720h;\u4131f;\u62b7ed;\u41b5\u0280;cfot\u04f4\u232c\u2331\u233d\u2341are;\u6105in\u0100;t\u2338\u2339\u621eie;\u69dddo\xf4\u2319\u0280;celp\u0757\u234c\u2350\u235b\u2361al;\u62ba\u0100gr\u2355\u2359er\xf3\u1563\xe3\u234darhk;\u6a17rod;\u6a3c\u0200cgpt\u236f\u2372\u2376\u237by;\u4451on;\u412ff;\uc000\ud835\udd5aa;\u43b9uest\u803b\xbf\u40bf\u0100ci\u238a\u238fr;\uc000\ud835\udcben\u0280;Edsv\u04f4\u239b\u239d\u23a1\u04f3;\u62f9ot;\u62f5\u0100;v\u23a6\u23a7\u62f4;\u62f3\u0100;i\u0777\u23aelde;\u4129\u01eb\u23b8\0\u23bccy;\u4456l\u803b\xef\u40ef\u0300cfmosu\u23cc\u23d7\u23dc\u23e1\u23e7\u23f5\u0100iy\u23d1\u23d5rc;\u4135;\u4439r;\uc000\ud835\udd27ath;\u4237pf;\uc000\ud835\udd5b\u01e3\u23ec\0\u23f1r;\uc000\ud835\udcbfrcy;\u4458kcy;\u4454\u0400acfghjos\u240b\u2416\u2422\u2427\u242d\u2431\u2435\u243bppa\u0100;v\u2413\u2414\u43ba;\u43f0\u0100ey\u241b\u2420dil;\u4137;\u443ar;\uc000\ud835\udd28reen;\u4138cy;\u4445cy;\u445cpf;\uc000\ud835\udd5ccr;\uc000\ud835\udcc0\u0b80ABEHabcdefghjlmnoprstuv\u2470\u2481\u2486\u248d\u2491\u250e\u253d\u255a\u2580\u264e\u265e\u2665\u2679\u267d\u269a\u26b2\u26d8\u275d\u2768\u278b\u27c0\u2801\u2812\u0180art\u2477\u247a\u247cr\xf2\u09c6\xf2\u0395ail;\u691barr;\u690e\u0100;g\u0994\u248b;\u6a8bar;\u6962\u0963\u24a5\0\u24aa\0\u24b1\0\0\0\0\0\u24b5\u24ba\0\u24c6\u24c8\u24cd\0\u24f9ute;\u413amptyv;\u69b4ra\xee\u084cbda;\u43bbg\u0180;dl\u088e\u24c1\u24c3;\u6991\xe5\u088e;\u6a85uo\u803b\xab\u40abr\u0400;bfhlpst\u0899\u24de\u24e6\u24e9\u24eb\u24ee\u24f1\u24f5\u0100;f\u089d\u24e3s;\u691fs;\u691d\xeb\u2252p;\u61abl;\u6939im;\u6973l;\u61a2\u0180;ae\u24ff\u2500\u2504\u6aabil;\u6919\u0100;s\u2509\u250a\u6aad;\uc000\u2aad\ufe00\u0180abr\u2515\u2519\u251drr;\u690crk;\u6772\u0100ak\u2522\u252cc\u0100ek\u2528\u252a;\u407b;\u405b\u0100es\u2531\u2533;\u698bl\u0100du\u2539\u253b;\u698f;\u698d\u0200aeuy\u2546\u254b\u2556\u2558ron;\u413e\u0100di\u2550\u2554il;\u413c\xec\u08b0\xe2\u2529;\u443b\u0200cqrs\u2563\u2566\u256d\u257da;\u6936uo\u0100;r\u0e19\u1746\u0100du\u2572\u2577har;\u6967shar;\u694bh;\u61b2\u0280;fgqs\u258b\u258c\u0989\u25f3\u25ff\u6264t\u0280ahlrt\u2598\u25a4\u25b7\u25c2\u25e8rrow\u0100;t\u0899\u25a1a\xe9\u24f6arpoon\u0100du\u25af\u25b4own\xbb\u045ap\xbb\u0966eftarrows;\u61c7ight\u0180ahs\u25cd\u25d6\u25derrow\u0100;s\u08f4\u08a7arpoon\xf3\u0f98quigarro\xf7\u21f0hreetimes;\u62cb\u0180;qs\u258b\u0993\u25falan\xf4\u09ac\u0280;cdgs\u09ac\u260a\u260d\u261d\u2628c;\u6aa8ot\u0100;o\u2614\u2615\u6a7f\u0100;r\u261a\u261b\u6a81;\u6a83\u0100;e\u2622\u2625\uc000\u22da\ufe00s;\u6a93\u0280adegs\u2633\u2639\u263d\u2649\u264bppro\xf8\u24c6ot;\u62d6q\u0100gq\u2643\u2645\xf4\u0989gt\xf2\u248c\xf4\u099bi\xed\u09b2\u0180ilr\u2655\u08e1\u265asht;\u697c;\uc000\ud835\udd29\u0100;E\u099c\u2663;\u6a91\u0161\u2669\u2676r\u0100du\u25b2\u266e\u0100;l\u0965\u2673;\u696alk;\u6584cy;\u4459\u0280;acht\u0a48\u2688\u268b\u2691\u2696r\xf2\u25c1orne\xf2\u1d08ard;\u696bri;\u65fa\u0100io\u269f\u26a4dot;\u4140ust\u0100;a\u26ac\u26ad\u63b0che\xbb\u26ad\u0200Eaes\u26bb\u26bd\u26c9\u26d4;\u6268p\u0100;p\u26c3\u26c4\u6a89rox\xbb\u26c4\u0100;q\u26ce\u26cf\u6a87\u0100;q\u26ce\u26bbim;\u62e6\u0400abnoptwz\u26e9\u26f4\u26f7\u271a\u272f\u2741\u2747\u2750\u0100nr\u26ee\u26f1g;\u67ecr;\u61fdr\xeb\u08c1g\u0180lmr\u26ff\u270d\u2714eft\u0100ar\u09e6\u2707ight\xe1\u09f2apsto;\u67fcight\xe1\u09fdparrow\u0100lr\u2725\u2729ef\xf4\u24edight;\u61ac\u0180afl\u2736\u2739\u273dr;\u6985;\uc000\ud835\udd5dus;\u6a2dimes;\u6a34\u0161\u274b\u274fst;\u6217\xe1\u134e\u0180;ef\u2757\u2758\u1800\u65cange\xbb\u2758ar\u0100;l\u2764\u2765\u4028t;\u6993\u0280achmt\u2773\u2776\u277c\u2785\u2787r\xf2\u08a8orne\xf2\u1d8car\u0100;d\u0f98\u2783;\u696d;\u600eri;\u62bf\u0300achiqt\u2798\u279d\u0a40\u27a2\u27ae\u27bbquo;\u6039r;\uc000\ud835\udcc1m\u0180;eg\u09b2\u27aa\u27ac;\u6a8d;\u6a8f\u0100bu\u252a\u27b3o\u0100;r\u0e1f\u27b9;\u601arok;\u4142\u8400<;cdhilqr\u082b\u27d2\u2639\u27dc\u27e0\u27e5\u27ea\u27f0\u0100ci\u27d7\u27d9;\u6aa6r;\u6a79re\xe5\u25f2mes;\u62c9arr;\u6976uest;\u6a7b\u0100Pi\u27f5\u27f9ar;\u6996\u0180;ef\u2800\u092d\u181b\u65c3r\u0100du\u2807\u280dshar;\u694ahar;\u6966\u0100en\u2817\u2821rtneqq;\uc000\u2268\ufe00\xc5\u281e\u0700Dacdefhilnopsu\u2840\u2845\u2882\u288e\u2893\u28a0\u28a5\u28a8\u28da\u28e2\u28e4\u0a83\u28f3\u2902Dot;\u623a\u0200clpr\u284e\u2852\u2863\u287dr\u803b\xaf\u40af\u0100et\u2857\u2859;\u6642\u0100;e\u285e\u285f\u6720se\xbb\u285f\u0100;s\u103b\u2868to\u0200;dlu\u103b\u2873\u2877\u287bow\xee\u048cef\xf4\u090f\xf0\u13d1ker;\u65ae\u0100oy\u2887\u288cmma;\u6a29;\u443cash;\u6014asuredangle\xbb\u1626r;\uc000\ud835\udd2ao;\u6127\u0180cdn\u28af\u28b4\u28c9ro\u803b\xb5\u40b5\u0200;acd\u1464\u28bd\u28c0\u28c4s\xf4\u16a7ir;\u6af0ot\u80bb\xb7\u01b5us\u0180;bd\u28d2\u1903\u28d3\u6212\u0100;u\u1d3c\u28d8;\u6a2a\u0163\u28de\u28e1p;\u6adb\xf2\u2212\xf0\u0a81\u0100dp\u28e9\u28eeels;\u62a7f;\uc000\ud835\udd5e\u0100ct\u28f8\u28fdr;\uc000\ud835\udcc2pos\xbb\u159d\u0180;lm\u2909\u290a\u290d\u43bctimap;\u62b8\u0c00GLRVabcdefghijlmoprstuvw\u2942\u2953\u297e\u2989\u2998\u29da\u29e9\u2a15\u2a1a\u2a58\u2a5d\u2a83\u2a95\u2aa4\u2aa8\u2b04\u2b07\u2b44\u2b7f\u2bae\u2c34\u2c67\u2c7c\u2ce9\u0100gt\u2947\u294b;\uc000\u22d9\u0338\u0100;v\u2950\u0bcf\uc000\u226b\u20d2\u0180elt\u295a\u2972\u2976ft\u0100ar\u2961\u2967rrow;\u61cdightarrow;\u61ce;\uc000\u22d8\u0338\u0100;v\u297b\u0c47\uc000\u226a\u20d2ightarrow;\u61cf\u0100Dd\u298e\u2993ash;\u62afash;\u62ae\u0280bcnpt\u29a3\u29a7\u29ac\u29b1\u29ccla\xbb\u02deute;\u4144g;\uc000\u2220\u20d2\u0280;Eiop\u0d84\u29bc\u29c0\u29c5\u29c8;\uc000\u2a70\u0338d;\uc000\u224b\u0338s;\u4149ro\xf8\u0d84ur\u0100;a\u29d3\u29d4\u666el\u0100;s\u29d3\u0b38\u01f3\u29df\0\u29e3p\u80bb\xa0\u0b37mp\u0100;e\u0bf9\u0c00\u0280aeouy\u29f4\u29fe\u2a03\u2a10\u2a13\u01f0\u29f9\0\u29fb;\u6a43on;\u4148dil;\u4146ng\u0100;d\u0d7e\u2a0aot;\uc000\u2a6d\u0338p;\u6a42;\u443dash;\u6013\u0380;Aadqsx\u0b92\u2a29\u2a2d\u2a3b\u2a41\u2a45\u2a50rr;\u61d7r\u0100hr\u2a33\u2a36k;\u6924\u0100;o\u13f2\u13f0ot;\uc000\u2250\u0338ui\xf6\u0b63\u0100ei\u2a4a\u2a4ear;\u6928\xed\u0b98ist\u0100;s\u0ba0\u0b9fr;\uc000\ud835\udd2b\u0200Eest\u0bc5\u2a66\u2a79\u2a7c\u0180;qs\u0bbc\u2a6d\u0be1\u0180;qs\u0bbc\u0bc5\u2a74lan\xf4\u0be2i\xed\u0bea\u0100;r\u0bb6\u2a81\xbb\u0bb7\u0180Aap\u2a8a\u2a8d\u2a91r\xf2\u2971rr;\u61aear;\u6af2\u0180;sv\u0f8d\u2a9c\u0f8c\u0100;d\u2aa1\u2aa2\u62fc;\u62facy;\u445a\u0380AEadest\u2ab7\u2aba\u2abe\u2ac2\u2ac5\u2af6\u2af9r\xf2\u2966;\uc000\u2266\u0338rr;\u619ar;\u6025\u0200;fqs\u0c3b\u2ace\u2ae3\u2aeft\u0100ar\u2ad4\u2ad9rro\xf7\u2ac1ightarro\xf7\u2a90\u0180;qs\u0c3b\u2aba\u2aealan\xf4\u0c55\u0100;s\u0c55\u2af4\xbb\u0c36i\xed\u0c5d\u0100;r\u0c35\u2afei\u0100;e\u0c1a\u0c25i\xe4\u0d90\u0100pt\u2b0c\u2b11f;\uc000\ud835\udd5f\u8180\xac;in\u2b19\u2b1a\u2b36\u40acn\u0200;Edv\u0b89\u2b24\u2b28\u2b2e;\uc000\u22f9\u0338ot;\uc000\u22f5\u0338\u01e1\u0b89\u2b33\u2b35;\u62f7;\u62f6i\u0100;v\u0cb8\u2b3c\u01e1\u0cb8\u2b41\u2b43;\u62fe;\u62fd\u0180aor\u2b4b\u2b63\u2b69r\u0200;ast\u0b7b\u2b55\u2b5a\u2b5flle\xec\u0b7bl;\uc000\u2afd\u20e5;\uc000\u2202\u0338lint;\u6a14\u0180;ce\u0c92\u2b70\u2b73u\xe5\u0ca5\u0100;c\u0c98\u2b78\u0100;e\u0c92\u2b7d\xf1\u0c98\u0200Aait\u2b88\u2b8b\u2b9d\u2ba7r\xf2\u2988rr\u0180;cw\u2b94\u2b95\u2b99\u619b;\uc000\u2933\u0338;\uc000\u219d\u0338ghtarrow\xbb\u2b95ri\u0100;e\u0ccb\u0cd6\u0380chimpqu\u2bbd\u2bcd\u2bd9\u2b04\u0b78\u2be4\u2bef\u0200;cer\u0d32\u2bc6\u0d37\u2bc9u\xe5\u0d45;\uc000\ud835\udcc3ort\u026d\u2b05\0\0\u2bd6ar\xe1\u2b56m\u0100;e\u0d6e\u2bdf\u0100;q\u0d74\u0d73su\u0100bp\u2beb\u2bed\xe5\u0cf8\xe5\u0d0b\u0180bcp\u2bf6\u2c11\u2c19\u0200;Ees\u2bff\u2c00\u0d22\u2c04\u6284;\uc000\u2ac5\u0338et\u0100;e\u0d1b\u2c0bq\u0100;q\u0d23\u2c00c\u0100;e\u0d32\u2c17\xf1\u0d38\u0200;Ees\u2c22\u2c23\u0d5f\u2c27\u6285;\uc000\u2ac6\u0338et\u0100;e\u0d58\u2c2eq\u0100;q\u0d60\u2c23\u0200gilr\u2c3d\u2c3f\u2c45\u2c47\xec\u0bd7lde\u803b\xf1\u40f1\xe7\u0c43iangle\u0100lr\u2c52\u2c5ceft\u0100;e\u0c1a\u2c5a\xf1\u0c26ight\u0100;e\u0ccb\u2c65\xf1\u0cd7\u0100;m\u2c6c\u2c6d\u43bd\u0180;es\u2c74\u2c75\u2c79\u4023ro;\u6116p;\u6007\u0480DHadgilrs\u2c8f\u2c94\u2c99\u2c9e\u2ca3\u2cb0\u2cb6\u2cd3\u2ce3ash;\u62adarr;\u6904p;\uc000\u224d\u20d2ash;\u62ac\u0100et\u2ca8\u2cac;\uc000\u2265\u20d2;\uc000>\u20d2nfin;\u69de\u0180Aet\u2cbd\u2cc1\u2cc5rr;\u6902;\uc000\u2264\u20d2\u0100;r\u2cca\u2ccd\uc000<\u20d2ie;\uc000\u22b4\u20d2\u0100At\u2cd8\u2cdcrr;\u6903rie;\uc000\u22b5\u20d2im;\uc000\u223c\u20d2\u0180Aan\u2cf0\u2cf4\u2d02rr;\u61d6r\u0100hr\u2cfa\u2cfdk;\u6923\u0100;o\u13e7\u13e5ear;\u6927\u1253\u1a95\0\0\0\0\0\0\0\0\0\0\0\0\0\u2d2d\0\u2d38\u2d48\u2d60\u2d65\u2d72\u2d84\u1b07\0\0\u2d8d\u2dab\0\u2dc8\u2dce\0\u2ddc\u2e19\u2e2b\u2e3e\u2e43\u0100cs\u2d31\u1a97ute\u803b\xf3\u40f3\u0100iy\u2d3c\u2d45r\u0100;c\u1a9e\u2d42\u803b\xf4\u40f4;\u443e\u0280abios\u1aa0\u2d52\u2d57\u01c8\u2d5alac;\u4151v;\u6a38old;\u69bclig;\u4153\u0100cr\u2d69\u2d6dir;\u69bf;\uc000\ud835\udd2c\u036f\u2d79\0\0\u2d7c\0\u2d82n;\u42dbave\u803b\xf2\u40f2;\u69c1\u0100bm\u2d88\u0df4ar;\u69b5\u0200acit\u2d95\u2d98\u2da5\u2da8r\xf2\u1a80\u0100ir\u2d9d\u2da0r;\u69beoss;\u69bbn\xe5\u0e52;\u69c0\u0180aei\u2db1\u2db5\u2db9cr;\u414dga;\u43c9\u0180cdn\u2dc0\u2dc5\u01cdron;\u43bf;\u69b6pf;\uc000\ud835\udd60\u0180ael\u2dd4\u2dd7\u01d2r;\u69b7rp;\u69b9\u0380;adiosv\u2dea\u2deb\u2dee\u2e08\u2e0d\u2e10\u2e16\u6228r\xf2\u1a86\u0200;efm\u2df7\u2df8\u2e02\u2e05\u6a5dr\u0100;o\u2dfe\u2dff\u6134f\xbb\u2dff\u803b\xaa\u40aa\u803b\xba\u40bagof;\u62b6r;\u6a56lope;\u6a57;\u6a5b\u0180clo\u2e1f\u2e21\u2e27\xf2\u2e01ash\u803b\xf8\u40f8l;\u6298i\u016c\u2e2f\u2e34de\u803b\xf5\u40f5es\u0100;a\u01db\u2e3as;\u6a36ml\u803b\xf6\u40f6bar;\u633d\u0ae1\u2e5e\0\u2e7d\0\u2e80\u2e9d\0\u2ea2\u2eb9\0\0\u2ecb\u0e9c\0\u2f13\0\0\u2f2b\u2fbc\0\u2fc8r\u0200;ast\u0403\u2e67\u2e72\u0e85\u8100\xb6;l\u2e6d\u2e6e\u40b6le\xec\u0403\u0269\u2e78\0\0\u2e7bm;\u6af3;\u6afdy;\u443fr\u0280cimpt\u2e8b\u2e8f\u2e93\u1865\u2e97nt;\u4025od;\u402eil;\u6030enk;\u6031r;\uc000\ud835\udd2d\u0180imo\u2ea8\u2eb0\u2eb4\u0100;v\u2ead\u2eae\u43c6;\u43d5ma\xf4\u0a76ne;\u660e\u0180;tv\u2ebf\u2ec0\u2ec8\u43c0chfork\xbb\u1ffd;\u43d6\u0100au\u2ecf\u2edfn\u0100ck\u2ed5\u2eddk\u0100;h\u21f4\u2edb;\u610e\xf6\u21f4s\u0480;abcdemst\u2ef3\u2ef4\u1908\u2ef9\u2efd\u2f04\u2f06\u2f0a\u2f0e\u402bcir;\u6a23ir;\u6a22\u0100ou\u1d40\u2f02;\u6a25;\u6a72n\u80bb\xb1\u0e9dim;\u6a26wo;\u6a27\u0180ipu\u2f19\u2f20\u2f25ntint;\u6a15f;\uc000\ud835\udd61nd\u803b\xa3\u40a3\u0500;Eaceinosu\u0ec8\u2f3f\u2f41\u2f44\u2f47\u2f81\u2f89\u2f92\u2f7e\u2fb6;\u6ab3p;\u6ab7u\xe5\u0ed9\u0100;c\u0ece\u2f4c\u0300;acens\u0ec8\u2f59\u2f5f\u2f66\u2f68\u2f7eppro\xf8\u2f43urlye\xf1\u0ed9\xf1\u0ece\u0180aes\u2f6f\u2f76\u2f7approx;\u6ab9qq;\u6ab5im;\u62e8i\xed\u0edfme\u0100;s\u2f88\u0eae\u6032\u0180Eas\u2f78\u2f90\u2f7a\xf0\u2f75\u0180dfp\u0eec\u2f99\u2faf\u0180als\u2fa0\u2fa5\u2faalar;\u632eine;\u6312urf;\u6313\u0100;t\u0efb\u2fb4\xef\u0efbrel;\u62b0\u0100ci\u2fc0\u2fc5r;\uc000\ud835\udcc5;\u43c8ncsp;\u6008\u0300fiopsu\u2fda\u22e2\u2fdf\u2fe5\u2feb\u2ff1r;\uc000\ud835\udd2epf;\uc000\ud835\udd62rime;\u6057cr;\uc000\ud835\udcc6\u0180aeo\u2ff8\u3009\u3013t\u0100ei\u2ffe\u3005rnion\xf3\u06b0nt;\u6a16st\u0100;e\u3010\u3011\u403f\xf1\u1f19\xf4\u0f14\u0a80ABHabcdefhilmnoprstux\u3040\u3051\u3055\u3059\u30e0\u310e\u312b\u3147\u3162\u3172\u318e\u3206\u3215\u3224\u3229\u3258\u326e\u3272\u3290\u32b0\u32b7\u0180art\u3047\u304a\u304cr\xf2\u10b3\xf2\u03ddail;\u691car\xf2\u1c65ar;\u6964\u0380cdenqrt\u3068\u3075\u3078\u307f\u308f\u3094\u30cc\u0100eu\u306d\u3071;\uc000\u223d\u0331te;\u4155i\xe3\u116emptyv;\u69b3g\u0200;del\u0fd1\u3089\u308b\u308d;\u6992;\u69a5\xe5\u0fd1uo\u803b\xbb\u40bbr\u0580;abcfhlpstw\u0fdc\u30ac\u30af\u30b7\u30b9\u30bc\u30be\u30c0\u30c3\u30c7\u30cap;\u6975\u0100;f\u0fe0\u30b4s;\u6920;\u6933s;\u691e\xeb\u225d\xf0\u272el;\u6945im;\u6974l;\u61a3;\u619d\u0100ai\u30d1\u30d5il;\u691ao\u0100;n\u30db\u30dc\u6236al\xf3\u0f1e\u0180abr\u30e7\u30ea\u30eer\xf2\u17e5rk;\u6773\u0100ak\u30f3\u30fdc\u0100ek\u30f9\u30fb;\u407d;\u405d\u0100es\u3102\u3104;\u698cl\u0100du\u310a\u310c;\u698e;\u6990\u0200aeuy\u3117\u311c\u3127\u3129ron;\u4159\u0100di\u3121\u3125il;\u4157\xec\u0ff2\xe2\u30fa;\u4440\u0200clqs\u3134\u3137\u313d\u3144a;\u6937dhar;\u6969uo\u0100;r\u020e\u020dh;\u61b3\u0180acg\u314e\u315f\u0f44l\u0200;ips\u0f78\u3158\u315b\u109cn\xe5\u10bbar\xf4\u0fa9t;\u65ad\u0180ilr\u3169\u1023\u316esht;\u697d;\uc000\ud835\udd2f\u0100ao\u3177\u3186r\u0100du\u317d\u317f\xbb\u047b\u0100;l\u1091\u3184;\u696c\u0100;v\u318b\u318c\u43c1;\u43f1\u0180gns\u3195\u31f9\u31fcht\u0300ahlrst\u31a4\u31b0\u31c2\u31d8\u31e4\u31eerrow\u0100;t\u0fdc\u31ada\xe9\u30c8arpoon\u0100du\u31bb\u31bfow\xee\u317ep\xbb\u1092eft\u0100ah\u31ca\u31d0rrow\xf3\u0feaarpoon\xf3\u0551ightarrows;\u61c9quigarro\xf7\u30cbhreetimes;\u62ccg;\u42daingdotse\xf1\u1f32\u0180ahm\u320d\u3210\u3213r\xf2\u0feaa\xf2\u0551;\u600foust\u0100;a\u321e\u321f\u63b1che\xbb\u321fmid;\u6aee\u0200abpt\u3232\u323d\u3240\u3252\u0100nr\u3237\u323ag;\u67edr;\u61fer\xeb\u1003\u0180afl\u3247\u324a\u324er;\u6986;\uc000\ud835\udd63us;\u6a2eimes;\u6a35\u0100ap\u325d\u3267r\u0100;g\u3263\u3264\u4029t;\u6994olint;\u6a12ar\xf2\u31e3\u0200achq\u327b\u3280\u10bc\u3285quo;\u603ar;\uc000\ud835\udcc7\u0100bu\u30fb\u328ao\u0100;r\u0214\u0213\u0180hir\u3297\u329b\u32a0re\xe5\u31f8mes;\u62cai\u0200;efl\u32aa\u1059\u1821\u32ab\u65b9tri;\u69celuhar;\u6968;\u611e\u0d61\u32d5\u32db\u32df\u332c\u3338\u3371\0\u337a\u33a4\0\0\u33ec\u33f0\0\u3428\u3448\u345a\u34ad\u34b1\u34ca\u34f1\0\u3616\0\0\u3633cute;\u415bqu\xef\u27ba\u0500;Eaceinpsy\u11ed\u32f3\u32f5\u32ff\u3302\u330b\u330f\u331f\u3326\u3329;\u6ab4\u01f0\u32fa\0\u32fc;\u6ab8on;\u4161u\xe5\u11fe\u0100;d\u11f3\u3307il;\u415frc;\u415d\u0180Eas\u3316\u3318\u331b;\u6ab6p;\u6abaim;\u62e9olint;\u6a13i\xed\u1204;\u4441ot\u0180;be\u3334\u1d47\u3335\u62c5;\u6a66\u0380Aacmstx\u3346\u334a\u3357\u335b\u335e\u3363\u336drr;\u61d8r\u0100hr\u3350\u3352\xeb\u2228\u0100;o\u0a36\u0a34t\u803b\xa7\u40a7i;\u403bwar;\u6929m\u0100in\u3369\xf0nu\xf3\xf1t;\u6736r\u0100;o\u3376\u2055\uc000\ud835\udd30\u0200acoy\u3382\u3386\u3391\u33a0rp;\u666f\u0100hy\u338b\u338fcy;\u4449;\u4448rt\u026d\u3399\0\0\u339ci\xe4\u1464ara\xec\u2e6f\u803b\xad\u40ad\u0100gm\u33a8\u33b4ma\u0180;fv\u33b1\u33b2\u33b2\u43c3;\u43c2\u0400;deglnpr\u12ab\u33c5\u33c9\u33ce\u33d6\u33de\u33e1\u33e6ot;\u6a6a\u0100;q\u12b1\u12b0\u0100;E\u33d3\u33d4\u6a9e;\u6aa0\u0100;E\u33db\u33dc\u6a9d;\u6a9fe;\u6246lus;\u6a24arr;\u6972ar\xf2\u113d\u0200aeit\u33f8\u3408\u340f\u3417\u0100ls\u33fd\u3404lsetm\xe9\u336ahp;\u6a33parsl;\u69e4\u0100dl\u1463\u3414e;\u6323\u0100;e\u341c\u341d\u6aaa\u0100;s\u3422\u3423\u6aac;\uc000\u2aac\ufe00\u0180flp\u342e\u3433\u3442tcy;\u444c\u0100;b\u3438\u3439\u402f\u0100;a\u343e\u343f\u69c4r;\u633ff;\uc000\ud835\udd64a\u0100dr\u344d\u0402es\u0100;u\u3454\u3455\u6660it\xbb\u3455\u0180csu\u3460\u3479\u349f\u0100au\u3465\u346fp\u0100;s\u1188\u346b;\uc000\u2293\ufe00p\u0100;s\u11b4\u3475;\uc000\u2294\ufe00u\u0100bp\u347f\u348f\u0180;es\u1197\u119c\u3486et\u0100;e\u1197\u348d\xf1\u119d\u0180;es\u11a8\u11ad\u3496et\u0100;e\u11a8\u349d\xf1\u11ae\u0180;af\u117b\u34a6\u05b0r\u0165\u34ab\u05b1\xbb\u117car\xf2\u1148\u0200cemt\u34b9\u34be\u34c2\u34c5r;\uc000\ud835\udcc8tm\xee\xf1i\xec\u3415ar\xe6\u11be\u0100ar\u34ce\u34d5r\u0100;f\u34d4\u17bf\u6606\u0100an\u34da\u34edight\u0100ep\u34e3\u34eapsilo\xee\u1ee0h\xe9\u2eafs\xbb\u2852\u0280bcmnp\u34fb\u355e\u1209\u358b\u358e\u0480;Edemnprs\u350e\u350f\u3511\u3515\u351e\u3523\u352c\u3531\u3536\u6282;\u6ac5ot;\u6abd\u0100;d\u11da\u351aot;\u6ac3ult;\u6ac1\u0100Ee\u3528\u352a;\u6acb;\u628alus;\u6abfarr;\u6979\u0180eiu\u353d\u3552\u3555t\u0180;en\u350e\u3545\u354bq\u0100;q\u11da\u350feq\u0100;q\u352b\u3528m;\u6ac7\u0100bp\u355a\u355c;\u6ad5;\u6ad3c\u0300;acens\u11ed\u356c\u3572\u3579\u357b\u3326ppro\xf8\u32faurlye\xf1\u11fe\xf1\u11f3\u0180aes\u3582\u3588\u331bppro\xf8\u331aq\xf1\u3317g;\u666a\u0680123;Edehlmnps\u35a9\u35ac\u35af\u121c\u35b2\u35b4\u35c0\u35c9\u35d5\u35da\u35df\u35e8\u35ed\u803b\xb9\u40b9\u803b\xb2\u40b2\u803b\xb3\u40b3;\u6ac6\u0100os\u35b9\u35bct;\u6abeub;\u6ad8\u0100;d\u1222\u35c5ot;\u6ac4s\u0100ou\u35cf\u35d2l;\u67c9b;\u6ad7arr;\u697bult;\u6ac2\u0100Ee\u35e4\u35e6;\u6acc;\u628blus;\u6ac0\u0180eiu\u35f4\u3609\u360ct\u0180;en\u121c\u35fc\u3602q\u0100;q\u1222\u35b2eq\u0100;q\u35e7\u35e4m;\u6ac8\u0100bp\u3611\u3613;\u6ad4;\u6ad6\u0180Aan\u361c\u3620\u362drr;\u61d9r\u0100hr\u3626\u3628\xeb\u222e\u0100;o\u0a2b\u0a29war;\u692alig\u803b\xdf\u40df\u0be1\u3651\u365d\u3660\u12ce\u3673\u3679\0\u367e\u36c2\0\0\0\0\0\u36db\u3703\0\u3709\u376c\0\0\0\u3787\u0272\u3656\0\0\u365bget;\u6316;\u43c4r\xeb\u0e5f\u0180aey\u3666\u366b\u3670ron;\u4165dil;\u4163;\u4442lrec;\u6315r;\uc000\ud835\udd31\u0200eiko\u3686\u369d\u36b5\u36bc\u01f2\u368b\0\u3691e\u01004f\u1284\u1281a\u0180;sv\u3698\u3699\u369b\u43b8ym;\u43d1\u0100cn\u36a2\u36b2k\u0100as\u36a8\u36aeppro\xf8\u12c1im\xbb\u12acs\xf0\u129e\u0100as\u36ba\u36ae\xf0\u12c1rn\u803b\xfe\u40fe\u01ec\u031f\u36c6\u22e7es\u8180\xd7;bd\u36cf\u36d0\u36d8\u40d7\u0100;a\u190f\u36d5r;\u6a31;\u6a30\u0180eps\u36e1\u36e3\u3700\xe1\u2a4d\u0200;bcf\u0486\u36ec\u36f0\u36f4ot;\u6336ir;\u6af1\u0100;o\u36f9\u36fc\uc000\ud835\udd65rk;\u6ada\xe1\u3362rime;\u6034\u0180aip\u370f\u3712\u3764d\xe5\u1248\u0380adempst\u3721\u374d\u3740\u3751\u3757\u375c\u375fngle\u0280;dlqr\u3730\u3731\u3736\u3740\u3742\u65b5own\xbb\u1dbbeft\u0100;e\u2800\u373e\xf1\u092e;\u625cight\u0100;e\u32aa\u374b\xf1\u105aot;\u65ecinus;\u6a3alus;\u6a39b;\u69cdime;\u6a3bezium;\u63e2\u0180cht\u3772\u377d\u3781\u0100ry\u3777\u377b;\uc000\ud835\udcc9;\u4446cy;\u445brok;\u4167\u0100io\u378b\u378ex\xf4\u1777head\u0100lr\u3797\u37a0eftarro\xf7\u084fightarrow\xbb\u0f5d\u0900AHabcdfghlmoprstuw\u37d0\u37d3\u37d7\u37e4\u37f0\u37fc\u380e\u381c\u3823\u3834\u3851\u385d\u386b\u38a9\u38cc\u38d2\u38ea\u38f6r\xf2\u03edar;\u6963\u0100cr\u37dc\u37e2ute\u803b\xfa\u40fa\xf2\u1150r\u01e3\u37ea\0\u37edy;\u445eve;\u416d\u0100iy\u37f5\u37farc\u803b\xfb\u40fb;\u4443\u0180abh\u3803\u3806\u380br\xf2\u13adlac;\u4171a\xf2\u13c3\u0100ir\u3813\u3818sht;\u697e;\uc000\ud835\udd32rave\u803b\xf9\u40f9\u0161\u3827\u3831r\u0100lr\u382c\u382e\xbb\u0957\xbb\u1083lk;\u6580\u0100ct\u3839\u384d\u026f\u383f\0\0\u384arn\u0100;e\u3845\u3846\u631cr\xbb\u3846op;\u630fri;\u65f8\u0100al\u3856\u385acr;\u416b\u80bb\xa8\u0349\u0100gp\u3862\u3866on;\u4173f;\uc000\ud835\udd66\u0300adhlsu\u114b\u3878\u387d\u1372\u3891\u38a0own\xe1\u13b3arpoon\u0100lr\u3888\u388cef\xf4\u382digh\xf4\u382fi\u0180;hl\u3899\u389a\u389c\u43c5\xbb\u13faon\xbb\u389aparrows;\u61c8\u0180cit\u38b0\u38c4\u38c8\u026f\u38b6\0\0\u38c1rn\u0100;e\u38bc\u38bd\u631dr\xbb\u38bdop;\u630eng;\u416fri;\u65f9cr;\uc000\ud835\udcca\u0180dir\u38d9\u38dd\u38e2ot;\u62f0lde;\u4169i\u0100;f\u3730\u38e8\xbb\u1813\u0100am\u38ef\u38f2r\xf2\u38a8l\u803b\xfc\u40fcangle;\u69a7\u0780ABDacdeflnoprsz\u391c\u391f\u3929\u392d\u39b5\u39b8\u39bd\u39df\u39e4\u39e8\u39f3\u39f9\u39fd\u3a01\u3a20r\xf2\u03f7ar\u0100;v\u3926\u3927\u6ae8;\u6ae9as\xe8\u03e1\u0100nr\u3932\u3937grt;\u699c\u0380eknprst\u34e3\u3946\u394b\u3952\u395d\u3964\u3996app\xe1\u2415othin\xe7\u1e96\u0180hir\u34eb\u2ec8\u3959op\xf4\u2fb5\u0100;h\u13b7\u3962\xef\u318d\u0100iu\u3969\u396dgm\xe1\u33b3\u0100bp\u3972\u3984setneq\u0100;q\u397d\u3980\uc000\u228a\ufe00;\uc000\u2acb\ufe00setneq\u0100;q\u398f\u3992\uc000\u228b\ufe00;\uc000\u2acc\ufe00\u0100hr\u399b\u399fet\xe1\u369ciangle\u0100lr\u39aa\u39afeft\xbb\u0925ight\xbb\u1051y;\u4432ash\xbb\u1036\u0180elr\u39c4\u39d2\u39d7\u0180;be\u2dea\u39cb\u39cfar;\u62bbq;\u625alip;\u62ee\u0100bt\u39dc\u1468a\xf2\u1469r;\uc000\ud835\udd33tr\xe9\u39aesu\u0100bp\u39ef\u39f1\xbb\u0d1c\xbb\u0d59pf;\uc000\ud835\udd67ro\xf0\u0efbtr\xe9\u39b4\u0100cu\u3a06\u3a0br;\uc000\ud835\udccb\u0100bp\u3a10\u3a18n\u0100Ee\u3980\u3a16\xbb\u397en\u0100Ee\u3992\u3a1e\xbb\u3990igzag;\u699a\u0380cefoprs\u3a36\u3a3b\u3a56\u3a5b\u3a54\u3a61\u3a6airc;\u4175\u0100di\u3a40\u3a51\u0100bg\u3a45\u3a49ar;\u6a5fe\u0100;q\u15fa\u3a4f;\u6259erp;\u6118r;\uc000\ud835\udd34pf;\uc000\ud835\udd68\u0100;e\u1479\u3a66at\xe8\u1479cr;\uc000\ud835\udccc\u0ae3\u178e\u3a87\0\u3a8b\0\u3a90\u3a9b\0\0\u3a9d\u3aa8\u3aab\u3aaf\0\0\u3ac3\u3ace\0\u3ad8\u17dc\u17dftr\xe9\u17d1r;\uc000\ud835\udd35\u0100Aa\u3a94\u3a97r\xf2\u03c3r\xf2\u09f6;\u43be\u0100Aa\u3aa1\u3aa4r\xf2\u03b8r\xf2\u09eba\xf0\u2713is;\u62fb\u0180dpt\u17a4\u3ab5\u3abe\u0100fl\u3aba\u17a9;\uc000\ud835\udd69im\xe5\u17b2\u0100Aa\u3ac7\u3acar\xf2\u03cer\xf2\u0a01\u0100cq\u3ad2\u17b8r;\uc000\ud835\udccd\u0100pt\u17d6\u3adcr\xe9\u17d4\u0400acefiosu\u3af0\u3afd\u3b08\u3b0c\u3b11\u3b15\u3b1b\u3b21c\u0100uy\u3af6\u3afbte\u803b\xfd\u40fd;\u444f\u0100iy\u3b02\u3b06rc;\u4177;\u444bn\u803b\xa5\u40a5r;\uc000\ud835\udd36cy;\u4457pf;\uc000\ud835\udd6acr;\uc000\ud835\udcce\u0100cm\u3b26\u3b29y;\u444el\u803b\xff\u40ff\u0500acdefhiosw\u3b42\u3b48\u3b54\u3b58\u3b64\u3b69\u3b6d\u3b74\u3b7a\u3b80cute;\u417a\u0100ay\u3b4d\u3b52ron;\u417e;\u4437ot;\u417c\u0100et\u3b5d\u3b61tr\xe6\u155fa;\u43b6r;\uc000\ud835\udd37cy;\u4436grarr;\u61ddpf;\uc000\ud835\udd6bcr;\uc000\ud835\udccf\u0100jn\u3b85\u3b87;\u600dj;\u600c"
    .split("")
    .map((c) => c.charCodeAt(0)));

// Generated using scripts/write-decode-map.ts
const xmlDecodeTree = /* #__PURE__ */ new Uint16Array(
// prettier-ignore
/* #__PURE__ */ "\u0200aglq\t\x15\x18\x1b\u026d\x0f\0\0\x12p;\u4026os;\u4027t;\u403et;\u403cuot;\u4022"
    .split("")
    .map((c) => c.charCodeAt(0)));

// Adapted from https://github.com/mathiasbynens/he/blob/36afe179392226cf1b6ccdb16ebbb7a5a844d93a/src/he.js#L106-L134
var _a$1;
const decodeMap$1 = new Map([
    [0, 65533],
    // C1 Unicode control character reference replacements
    [128, 8364],
    [130, 8218],
    [131, 402],
    [132, 8222],
    [133, 8230],
    [134, 8224],
    [135, 8225],
    [136, 710],
    [137, 8240],
    [138, 352],
    [139, 8249],
    [140, 338],
    [142, 381],
    [145, 8216],
    [146, 8217],
    [147, 8220],
    [148, 8221],
    [149, 8226],
    [150, 8211],
    [151, 8212],
    [152, 732],
    [153, 8482],
    [154, 353],
    [155, 8250],
    [156, 339],
    [158, 382],
    [159, 376],
]);
/**
 * Polyfill for `String.fromCodePoint`. It is used to create a string from a Unicode code point.
 */
const fromCodePoint = 
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, n/no-unsupported-features/es-builtins
(_a$1 = String.fromCodePoint) !== null && _a$1 !== void 0 ? _a$1 : function (codePoint) {
    let output = "";
    if (codePoint > 65535) {
        codePoint -= 65536;
        output += String.fromCharCode(((codePoint >>> 10) & 1023) | 55296);
        codePoint = 56320 | (codePoint & 1023);
    }
    output += String.fromCharCode(codePoint);
    return output;
};
/**
 * Replace the given code point with a replacement character if it is a
 * surrogate or is outside the valid range. Otherwise return the code
 * point unchanged.
 */
function replaceCodePoint$1(codePoint) {
    var _a;
    if ((codePoint >= 55296 && codePoint <= 57343) ||
        codePoint > 1114111) {
        return 65533;
    }
    return (_a = decodeMap$1.get(codePoint)) !== null && _a !== void 0 ? _a : codePoint;
}

var CharCodes$2;
(function (CharCodes) {
    CharCodes[CharCodes["NUM"] = 35] = "NUM";
    CharCodes[CharCodes["SEMI"] = 59] = "SEMI";
    CharCodes[CharCodes["EQUALS"] = 61] = "EQUALS";
    CharCodes[CharCodes["ZERO"] = 48] = "ZERO";
    CharCodes[CharCodes["NINE"] = 57] = "NINE";
    CharCodes[CharCodes["LOWER_A"] = 97] = "LOWER_A";
    CharCodes[CharCodes["LOWER_F"] = 102] = "LOWER_F";
    CharCodes[CharCodes["LOWER_X"] = 120] = "LOWER_X";
    CharCodes[CharCodes["LOWER_Z"] = 122] = "LOWER_Z";
    CharCodes[CharCodes["UPPER_A"] = 65] = "UPPER_A";
    CharCodes[CharCodes["UPPER_F"] = 70] = "UPPER_F";
    CharCodes[CharCodes["UPPER_Z"] = 90] = "UPPER_Z";
})(CharCodes$2 || (CharCodes$2 = {}));
/** Bit that needs to be set to convert an upper case ASCII character to lower case */
const TO_LOWER_BIT$1 = 32;
var BinTrieFlags$1;
(function (BinTrieFlags) {
    BinTrieFlags[BinTrieFlags["VALUE_LENGTH"] = 49152] = "VALUE_LENGTH";
    BinTrieFlags[BinTrieFlags["BRANCH_LENGTH"] = 16256] = "BRANCH_LENGTH";
    BinTrieFlags[BinTrieFlags["JUMP_TABLE"] = 127] = "JUMP_TABLE";
})(BinTrieFlags$1 || (BinTrieFlags$1 = {}));
function isNumber$1(code) {
    return code >= CharCodes$2.ZERO && code <= CharCodes$2.NINE;
}
function isHexadecimalCharacter$1(code) {
    return ((code >= CharCodes$2.UPPER_A && code <= CharCodes$2.UPPER_F) ||
        (code >= CharCodes$2.LOWER_A && code <= CharCodes$2.LOWER_F));
}
function isAsciiAlphaNumeric$2(code) {
    return ((code >= CharCodes$2.UPPER_A && code <= CharCodes$2.UPPER_Z) ||
        (code >= CharCodes$2.LOWER_A && code <= CharCodes$2.LOWER_Z) ||
        isNumber$1(code));
}
/**
 * Checks if the given character is a valid end character for an entity in an attribute.
 *
 * Attribute values that aren't terminated properly aren't parsed, and shouldn't lead to a parser error.
 * See the example in https://html.spec.whatwg.org/multipage/parsing.html#named-character-reference-state
 */
function isEntityInAttributeInvalidEnd$1(code) {
    return code === CharCodes$2.EQUALS || isAsciiAlphaNumeric$2(code);
}
var EntityDecoderState$1;
(function (EntityDecoderState) {
    EntityDecoderState[EntityDecoderState["EntityStart"] = 0] = "EntityStart";
    EntityDecoderState[EntityDecoderState["NumericStart"] = 1] = "NumericStart";
    EntityDecoderState[EntityDecoderState["NumericDecimal"] = 2] = "NumericDecimal";
    EntityDecoderState[EntityDecoderState["NumericHex"] = 3] = "NumericHex";
    EntityDecoderState[EntityDecoderState["NamedEntity"] = 4] = "NamedEntity";
})(EntityDecoderState$1 || (EntityDecoderState$1 = {}));
var DecodingMode$1;
(function (DecodingMode) {
    /** Entities in text nodes that can end with any character. */
    DecodingMode[DecodingMode["Legacy"] = 0] = "Legacy";
    /** Only allow entities terminated with a semicolon. */
    DecodingMode[DecodingMode["Strict"] = 1] = "Strict";
    /** Entities in attributes have limitations on ending characters. */
    DecodingMode[DecodingMode["Attribute"] = 2] = "Attribute";
})(DecodingMode$1 || (DecodingMode$1 = {}));
/**
 * Token decoder with support of writing partial entities.
 */
class EntityDecoder$1 {
    constructor(
    /** The tree used to decode entities. */
    decodeTree, 
    /**
     * The function that is called when a codepoint is decoded.
     *
     * For multi-byte named entities, this will be called multiple times,
     * with the second codepoint, and the same `consumed` value.
     *
     * @param codepoint The decoded codepoint.
     * @param consumed The number of bytes consumed by the decoder.
     */
    emitCodePoint, 
    /** An object that is used to produce errors. */
    errors) {
        this.decodeTree = decodeTree;
        this.emitCodePoint = emitCodePoint;
        this.errors = errors;
        /** The current state of the decoder. */
        this.state = EntityDecoderState$1.EntityStart;
        /** Characters that were consumed while parsing an entity. */
        this.consumed = 1;
        /**
         * The result of the entity.
         *
         * Either the result index of a numeric entity, or the codepoint of a
         * numeric entity.
         */
        this.result = 0;
        /** The current index in the decode tree. */
        this.treeIndex = 0;
        /** The number of characters that were consumed in excess. */
        this.excess = 1;
        /** The mode in which the decoder is operating. */
        this.decodeMode = DecodingMode$1.Strict;
    }
    /** Resets the instance to make it reusable. */
    startEntity(decodeMode) {
        this.decodeMode = decodeMode;
        this.state = EntityDecoderState$1.EntityStart;
        this.result = 0;
        this.treeIndex = 0;
        this.excess = 1;
        this.consumed = 1;
    }
    /**
     * Write an entity to the decoder. This can be called multiple times with partial entities.
     * If the entity is incomplete, the decoder will return -1.
     *
     * Mirrors the implementation of `getDecoder`, but with the ability to stop decoding if the
     * entity is incomplete, and resume when the next string is written.
     *
     * @param input The string containing the entity (or a continuation of the entity).
     * @param offset The offset at which the entity begins. Should be 0 if this is not the first call.
     * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
     */
    write(input, offset) {
        switch (this.state) {
            case EntityDecoderState$1.EntityStart: {
                if (input.charCodeAt(offset) === CharCodes$2.NUM) {
                    this.state = EntityDecoderState$1.NumericStart;
                    this.consumed += 1;
                    return this.stateNumericStart(input, offset + 1);
                }
                this.state = EntityDecoderState$1.NamedEntity;
                return this.stateNamedEntity(input, offset);
            }
            case EntityDecoderState$1.NumericStart: {
                return this.stateNumericStart(input, offset);
            }
            case EntityDecoderState$1.NumericDecimal: {
                return this.stateNumericDecimal(input, offset);
            }
            case EntityDecoderState$1.NumericHex: {
                return this.stateNumericHex(input, offset);
            }
            case EntityDecoderState$1.NamedEntity: {
                return this.stateNamedEntity(input, offset);
            }
        }
    }
    /**
     * Switches between the numeric decimal and hexadecimal states.
     *
     * Equivalent to the `Numeric character reference state` in the HTML spec.
     *
     * @param input The string containing the entity (or a continuation of the entity).
     * @param offset The current offset.
     * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
     */
    stateNumericStart(input, offset) {
        if (offset >= input.length) {
            return -1;
        }
        if ((input.charCodeAt(offset) | TO_LOWER_BIT$1) === CharCodes$2.LOWER_X) {
            this.state = EntityDecoderState$1.NumericHex;
            this.consumed += 1;
            return this.stateNumericHex(input, offset + 1);
        }
        this.state = EntityDecoderState$1.NumericDecimal;
        return this.stateNumericDecimal(input, offset);
    }
    addToNumericResult(input, start, end, base) {
        if (start !== end) {
            const digitCount = end - start;
            this.result =
                this.result * Math.pow(base, digitCount) +
                    Number.parseInt(input.substr(start, digitCount), base);
            this.consumed += digitCount;
        }
    }
    /**
     * Parses a hexadecimal numeric entity.
     *
     * Equivalent to the `Hexademical character reference state` in the HTML spec.
     *
     * @param input The string containing the entity (or a continuation of the entity).
     * @param offset The current offset.
     * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
     */
    stateNumericHex(input, offset) {
        const startIndex = offset;
        while (offset < input.length) {
            const char = input.charCodeAt(offset);
            if (isNumber$1(char) || isHexadecimalCharacter$1(char)) {
                offset += 1;
            }
            else {
                this.addToNumericResult(input, startIndex, offset, 16);
                return this.emitNumericEntity(char, 3);
            }
        }
        this.addToNumericResult(input, startIndex, offset, 16);
        return -1;
    }
    /**
     * Parses a decimal numeric entity.
     *
     * Equivalent to the `Decimal character reference state` in the HTML spec.
     *
     * @param input The string containing the entity (or a continuation of the entity).
     * @param offset The current offset.
     * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
     */
    stateNumericDecimal(input, offset) {
        const startIndex = offset;
        while (offset < input.length) {
            const char = input.charCodeAt(offset);
            if (isNumber$1(char)) {
                offset += 1;
            }
            else {
                this.addToNumericResult(input, startIndex, offset, 10);
                return this.emitNumericEntity(char, 2);
            }
        }
        this.addToNumericResult(input, startIndex, offset, 10);
        return -1;
    }
    /**
     * Validate and emit a numeric entity.
     *
     * Implements the logic from the `Hexademical character reference start
     * state` and `Numeric character reference end state` in the HTML spec.
     *
     * @param lastCp The last code point of the entity. Used to see if the
     *               entity was terminated with a semicolon.
     * @param expectedLength The minimum number of characters that should be
     *                       consumed. Used to validate that at least one digit
     *                       was consumed.
     * @returns The number of characters that were consumed.
     */
    emitNumericEntity(lastCp, expectedLength) {
        var _a;
        // Ensure we consumed at least one digit.
        if (this.consumed <= expectedLength) {
            (_a = this.errors) === null || _a === void 0 ? void 0 : _a.absenceOfDigitsInNumericCharacterReference(this.consumed);
            return 0;
        }
        // Figure out if this is a legit end of the entity
        if (lastCp === CharCodes$2.SEMI) {
            this.consumed += 1;
        }
        else if (this.decodeMode === DecodingMode$1.Strict) {
            return 0;
        }
        this.emitCodePoint(replaceCodePoint$1(this.result), this.consumed);
        if (this.errors) {
            if (lastCp !== CharCodes$2.SEMI) {
                this.errors.missingSemicolonAfterCharacterReference();
            }
            this.errors.validateNumericCharacterReference(this.result);
        }
        return this.consumed;
    }
    /**
     * Parses a named entity.
     *
     * Equivalent to the `Named character reference state` in the HTML spec.
     *
     * @param input The string containing the entity (or a continuation of the entity).
     * @param offset The current offset.
     * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
     */
    stateNamedEntity(input, offset) {
        const { decodeTree } = this;
        let current = decodeTree[this.treeIndex];
        // The mask is the number of bytes of the value, including the current byte.
        let valueLength = (current & BinTrieFlags$1.VALUE_LENGTH) >> 14;
        for (; offset < input.length; offset++, this.excess++) {
            const char = input.charCodeAt(offset);
            this.treeIndex = determineBranch$1(decodeTree, current, this.treeIndex + Math.max(1, valueLength), char);
            if (this.treeIndex < 0) {
                return this.result === 0 ||
                    // If we are parsing an attribute
                    (this.decodeMode === DecodingMode$1.Attribute &&
                        // We shouldn't have consumed any characters after the entity,
                        (valueLength === 0 ||
                            // And there should be no invalid characters.
                            isEntityInAttributeInvalidEnd$1(char)))
                    ? 0
                    : this.emitNotTerminatedNamedEntity();
            }
            current = decodeTree[this.treeIndex];
            valueLength = (current & BinTrieFlags$1.VALUE_LENGTH) >> 14;
            // If the branch is a value, store it and continue
            if (valueLength !== 0) {
                // If the entity is terminated by a semicolon, we are done.
                if (char === CharCodes$2.SEMI) {
                    return this.emitNamedEntityData(this.treeIndex, valueLength, this.consumed + this.excess);
                }
                // If we encounter a non-terminated (legacy) entity while parsing strictly, then ignore it.
                if (this.decodeMode !== DecodingMode$1.Strict) {
                    this.result = this.treeIndex;
                    this.consumed += this.excess;
                    this.excess = 0;
                }
            }
        }
        return -1;
    }
    /**
     * Emit a named entity that was not terminated with a semicolon.
     *
     * @returns The number of characters consumed.
     */
    emitNotTerminatedNamedEntity() {
        var _a;
        const { result, decodeTree } = this;
        const valueLength = (decodeTree[result] & BinTrieFlags$1.VALUE_LENGTH) >> 14;
        this.emitNamedEntityData(result, valueLength, this.consumed);
        (_a = this.errors) === null || _a === void 0 ? void 0 : _a.missingSemicolonAfterCharacterReference();
        return this.consumed;
    }
    /**
     * Emit a named entity.
     *
     * @param result The index of the entity in the decode tree.
     * @param valueLength The number of bytes in the entity.
     * @param consumed The number of characters consumed.
     *
     * @returns The number of characters consumed.
     */
    emitNamedEntityData(result, valueLength, consumed) {
        const { decodeTree } = this;
        this.emitCodePoint(valueLength === 1
            ? decodeTree[result] & ~BinTrieFlags$1.VALUE_LENGTH
            : decodeTree[result + 1], consumed);
        if (valueLength === 3) {
            // For multi-byte values, we need to emit the second byte.
            this.emitCodePoint(decodeTree[result + 2], consumed);
        }
        return consumed;
    }
    /**
     * Signal to the parser that the end of the input was reached.
     *
     * Remaining data will be emitted and relevant errors will be produced.
     *
     * @returns The number of characters consumed.
     */
    end() {
        var _a;
        switch (this.state) {
            case EntityDecoderState$1.NamedEntity: {
                // Emit a named entity if we have one.
                return this.result !== 0 &&
                    (this.decodeMode !== DecodingMode$1.Attribute ||
                        this.result === this.treeIndex)
                    ? this.emitNotTerminatedNamedEntity()
                    : 0;
            }
            // Otherwise, emit a numeric entity if we have one.
            case EntityDecoderState$1.NumericDecimal: {
                return this.emitNumericEntity(0, 2);
            }
            case EntityDecoderState$1.NumericHex: {
                return this.emitNumericEntity(0, 3);
            }
            case EntityDecoderState$1.NumericStart: {
                (_a = this.errors) === null || _a === void 0 ? void 0 : _a.absenceOfDigitsInNumericCharacterReference(this.consumed);
                return 0;
            }
            case EntityDecoderState$1.EntityStart: {
                // Return 0 if we have no entity.
                return 0;
            }
        }
    }
}
/**
 * Determines the branch of the current node that is taken given the current
 * character. This function is used to traverse the trie.
 *
 * @param decodeTree The trie.
 * @param current The current node.
 * @param nodeIdx The index right after the current node and its value.
 * @param char The current character.
 * @returns The index of the next node, or -1 if no branch is taken.
 */
function determineBranch$1(decodeTree, current, nodeIndex, char) {
    const branchCount = (current & BinTrieFlags$1.BRANCH_LENGTH) >> 7;
    const jumpOffset = current & BinTrieFlags$1.JUMP_TABLE;
    // Case 1: Single branch encoded in jump offset
    if (branchCount === 0) {
        return jumpOffset !== 0 && char === jumpOffset ? nodeIndex : -1;
    }
    // Case 2: Multiple branches encoded in jump table
    if (jumpOffset) {
        const value = char - jumpOffset;
        return value < 0 || value >= branchCount
            ? -1
            : decodeTree[nodeIndex + value] - 1;
    }
    // Case 3: Multiple branches encoded in dictionary
    // Binary search for the character.
    let lo = nodeIndex;
    let hi = lo + branchCount - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        const midValue = decodeTree[mid];
        if (midValue < char) {
            lo = mid + 1;
        }
        else if (midValue > char) {
            hi = mid - 1;
        }
        else {
            return decodeTree[mid + branchCount];
        }
    }
    return -1;
}

var CharCodes$1;
(function (CharCodes) {
    CharCodes[CharCodes["Tab"] = 9] = "Tab";
    CharCodes[CharCodes["NewLine"] = 10] = "NewLine";
    CharCodes[CharCodes["FormFeed"] = 12] = "FormFeed";
    CharCodes[CharCodes["CarriageReturn"] = 13] = "CarriageReturn";
    CharCodes[CharCodes["Space"] = 32] = "Space";
    CharCodes[CharCodes["ExclamationMark"] = 33] = "ExclamationMark";
    CharCodes[CharCodes["Number"] = 35] = "Number";
    CharCodes[CharCodes["Amp"] = 38] = "Amp";
    CharCodes[CharCodes["SingleQuote"] = 39] = "SingleQuote";
    CharCodes[CharCodes["DoubleQuote"] = 34] = "DoubleQuote";
    CharCodes[CharCodes["Dash"] = 45] = "Dash";
    CharCodes[CharCodes["Slash"] = 47] = "Slash";
    CharCodes[CharCodes["Zero"] = 48] = "Zero";
    CharCodes[CharCodes["Nine"] = 57] = "Nine";
    CharCodes[CharCodes["Semi"] = 59] = "Semi";
    CharCodes[CharCodes["Lt"] = 60] = "Lt";
    CharCodes[CharCodes["Eq"] = 61] = "Eq";
    CharCodes[CharCodes["Gt"] = 62] = "Gt";
    CharCodes[CharCodes["Questionmark"] = 63] = "Questionmark";
    CharCodes[CharCodes["UpperA"] = 65] = "UpperA";
    CharCodes[CharCodes["LowerA"] = 97] = "LowerA";
    CharCodes[CharCodes["UpperF"] = 70] = "UpperF";
    CharCodes[CharCodes["LowerF"] = 102] = "LowerF";
    CharCodes[CharCodes["UpperZ"] = 90] = "UpperZ";
    CharCodes[CharCodes["LowerZ"] = 122] = "LowerZ";
    CharCodes[CharCodes["LowerX"] = 120] = "LowerX";
    CharCodes[CharCodes["OpeningSquareBracket"] = 91] = "OpeningSquareBracket";
})(CharCodes$1 || (CharCodes$1 = {}));
/** All the states the tokenizer can be in. */
var State$1;
(function (State) {
    State[State["Text"] = 1] = "Text";
    State[State["BeforeTagName"] = 2] = "BeforeTagName";
    State[State["InTagName"] = 3] = "InTagName";
    State[State["InSelfClosingTag"] = 4] = "InSelfClosingTag";
    State[State["BeforeClosingTagName"] = 5] = "BeforeClosingTagName";
    State[State["InClosingTagName"] = 6] = "InClosingTagName";
    State[State["AfterClosingTagName"] = 7] = "AfterClosingTagName";
    // Attributes
    State[State["BeforeAttributeName"] = 8] = "BeforeAttributeName";
    State[State["InAttributeName"] = 9] = "InAttributeName";
    State[State["AfterAttributeName"] = 10] = "AfterAttributeName";
    State[State["BeforeAttributeValue"] = 11] = "BeforeAttributeValue";
    State[State["InAttributeValueDq"] = 12] = "InAttributeValueDq";
    State[State["InAttributeValueSq"] = 13] = "InAttributeValueSq";
    State[State["InAttributeValueNq"] = 14] = "InAttributeValueNq";
    // Declarations
    State[State["BeforeDeclaration"] = 15] = "BeforeDeclaration";
    State[State["InDeclaration"] = 16] = "InDeclaration";
    // Processing instructions
    State[State["InProcessingInstruction"] = 17] = "InProcessingInstruction";
    // Comments & CDATA
    State[State["BeforeComment"] = 18] = "BeforeComment";
    State[State["CDATASequence"] = 19] = "CDATASequence";
    State[State["InSpecialComment"] = 20] = "InSpecialComment";
    State[State["InCommentLike"] = 21] = "InCommentLike";
    // Special tags
    State[State["BeforeSpecialS"] = 22] = "BeforeSpecialS";
    State[State["BeforeSpecialT"] = 23] = "BeforeSpecialT";
    State[State["SpecialStartSequence"] = 24] = "SpecialStartSequence";
    State[State["InSpecialTag"] = 25] = "InSpecialTag";
    State[State["InEntity"] = 26] = "InEntity";
})(State$1 || (State$1 = {}));
function isWhitespace$2(c) {
    return (c === CharCodes$1.Space ||
        c === CharCodes$1.NewLine ||
        c === CharCodes$1.Tab ||
        c === CharCodes$1.FormFeed ||
        c === CharCodes$1.CarriageReturn);
}
function isEndOfTagSection(c) {
    return c === CharCodes$1.Slash || c === CharCodes$1.Gt || isWhitespace$2(c);
}
function isASCIIAlpha(c) {
    return ((c >= CharCodes$1.LowerA && c <= CharCodes$1.LowerZ) ||
        (c >= CharCodes$1.UpperA && c <= CharCodes$1.UpperZ));
}
var QuoteType;
(function (QuoteType) {
    QuoteType[QuoteType["NoValue"] = 0] = "NoValue";
    QuoteType[QuoteType["Unquoted"] = 1] = "Unquoted";
    QuoteType[QuoteType["Single"] = 2] = "Single";
    QuoteType[QuoteType["Double"] = 3] = "Double";
})(QuoteType || (QuoteType = {}));
/**
 * Sequences used to match longer strings.
 *
 * We don't have `Script`, `Style`, or `Title` here. Instead, we re-use the *End
 * sequences with an increased offset.
 */
const Sequences = {
    Cdata: new Uint8Array([0x43, 0x44, 0x41, 0x54, 0x41, 0x5b]), // CDATA[
    CdataEnd: new Uint8Array([0x5d, 0x5d, 0x3e]), // ]]>
    CommentEnd: new Uint8Array([0x2d, 0x2d, 0x3e]), // `-->`
    ScriptEnd: new Uint8Array([0x3c, 0x2f, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74]), // `</script`
    StyleEnd: new Uint8Array([0x3c, 0x2f, 0x73, 0x74, 0x79, 0x6c, 0x65]), // `</style`
    TitleEnd: new Uint8Array([0x3c, 0x2f, 0x74, 0x69, 0x74, 0x6c, 0x65]), // `</title`
    TextareaEnd: new Uint8Array([
        0x3c, 0x2f, 0x74, 0x65, 0x78, 0x74, 0x61, 0x72, 0x65, 0x61,
    ]), // `</textarea`
    XmpEnd: new Uint8Array([0x3c, 0x2f, 0x78, 0x6d, 0x70]), // `</xmp`
};
class Tokenizer$1 {
    constructor({ xmlMode = false, decodeEntities = true, }, cbs) {
        this.cbs = cbs;
        /** The current state the tokenizer is in. */
        this.state = State$1.Text;
        /** The read buffer. */
        this.buffer = "";
        /** The beginning of the section that is currently being read. */
        this.sectionStart = 0;
        /** The index within the buffer that we are currently looking at. */
        this.index = 0;
        /** The start of the last entity. */
        this.entityStart = 0;
        /** Some behavior, eg. when decoding entities, is done while we are in another state. This keeps track of the other state type. */
        this.baseState = State$1.Text;
        /** For special parsing behavior inside of script and style tags. */
        this.isSpecial = false;
        /** Indicates whether the tokenizer has been paused. */
        this.running = true;
        /** The offset of the current buffer. */
        this.offset = 0;
        this.currentSequence = undefined;
        this.sequenceIndex = 0;
        this.xmlMode = xmlMode;
        this.decodeEntities = decodeEntities;
        this.entityDecoder = new EntityDecoder$1(xmlMode ? xmlDecodeTree : htmlDecodeTree$1, (cp, consumed) => this.emitCodePoint(cp, consumed));
    }
    reset() {
        this.state = State$1.Text;
        this.buffer = "";
        this.sectionStart = 0;
        this.index = 0;
        this.baseState = State$1.Text;
        this.currentSequence = undefined;
        this.running = true;
        this.offset = 0;
    }
    write(chunk) {
        this.offset += this.buffer.length;
        this.buffer = chunk;
        this.parse();
    }
    end() {
        if (this.running)
            this.finish();
    }
    pause() {
        this.running = false;
    }
    resume() {
        this.running = true;
        if (this.index < this.buffer.length + this.offset) {
            this.parse();
        }
    }
    stateText(c) {
        if (c === CharCodes$1.Lt ||
            (!this.decodeEntities && this.fastForwardTo(CharCodes$1.Lt))) {
            if (this.index > this.sectionStart) {
                this.cbs.ontext(this.sectionStart, this.index);
            }
            this.state = State$1.BeforeTagName;
            this.sectionStart = this.index;
        }
        else if (this.decodeEntities && c === CharCodes$1.Amp) {
            this.startEntity();
        }
    }
    stateSpecialStartSequence(c) {
        const isEnd = this.sequenceIndex === this.currentSequence.length;
        const isMatch = isEnd
            ? // If we are at the end of the sequence, make sure the tag name has ended
                isEndOfTagSection(c)
            : // Otherwise, do a case-insensitive comparison
                (c | 0x20) === this.currentSequence[this.sequenceIndex];
        if (!isMatch) {
            this.isSpecial = false;
        }
        else if (!isEnd) {
            this.sequenceIndex++;
            return;
        }
        this.sequenceIndex = 0;
        this.state = State$1.InTagName;
        this.stateInTagName(c);
    }
    /** Look for an end tag. For <title> tags, also decode entities. */
    stateInSpecialTag(c) {
        if (this.sequenceIndex === this.currentSequence.length) {
            if (c === CharCodes$1.Gt || isWhitespace$2(c)) {
                const endOfText = this.index - this.currentSequence.length;
                if (this.sectionStart < endOfText) {
                    // Spoof the index so that reported locations match up.
                    const actualIndex = this.index;
                    this.index = endOfText;
                    this.cbs.ontext(this.sectionStart, endOfText);
                    this.index = actualIndex;
                }
                this.isSpecial = false;
                this.sectionStart = endOfText + 2; // Skip over the `</`
                this.stateInClosingTagName(c);
                return; // We are done; skip the rest of the function.
            }
            this.sequenceIndex = 0;
        }
        if ((c | 0x20) === this.currentSequence[this.sequenceIndex]) {
            this.sequenceIndex += 1;
        }
        else if (this.sequenceIndex === 0) {
            if (this.currentSequence === Sequences.TitleEnd) {
                // We have to parse entities in <title> tags.
                if (this.decodeEntities && c === CharCodes$1.Amp) {
                    this.startEntity();
                }
            }
            else if (this.fastForwardTo(CharCodes$1.Lt)) {
                // Outside of <title> tags, we can fast-forward.
                this.sequenceIndex = 1;
            }
        }
        else {
            // If we see a `<`, set the sequence index to 1; useful for eg. `<</script>`.
            this.sequenceIndex = Number(c === CharCodes$1.Lt);
        }
    }
    stateCDATASequence(c) {
        if (c === Sequences.Cdata[this.sequenceIndex]) {
            if (++this.sequenceIndex === Sequences.Cdata.length) {
                this.state = State$1.InCommentLike;
                this.currentSequence = Sequences.CdataEnd;
                this.sequenceIndex = 0;
                this.sectionStart = this.index + 1;
            }
        }
        else {
            this.sequenceIndex = 0;
            this.state = State$1.InDeclaration;
            this.stateInDeclaration(c); // Reconsume the character
        }
    }
    /**
     * When we wait for one specific character, we can speed things up
     * by skipping through the buffer until we find it.
     *
     * @returns Whether the character was found.
     */
    fastForwardTo(c) {
        while (++this.index < this.buffer.length + this.offset) {
            if (this.buffer.charCodeAt(this.index - this.offset) === c) {
                return true;
            }
        }
        /*
         * We increment the index at the end of the `parse` loop,
         * so set it to `buffer.length - 1` here.
         *
         * TODO: Refactor `parse` to increment index before calling states.
         */
        this.index = this.buffer.length + this.offset - 1;
        return false;
    }
    /**
     * Comments and CDATA end with `-->` and `]]>`.
     *
     * Their common qualities are:
     * - Their end sequences have a distinct character they start with.
     * - That character is then repeated, so we have to check multiple repeats.
     * - All characters but the start character of the sequence can be skipped.
     */
    stateInCommentLike(c) {
        if (c === this.currentSequence[this.sequenceIndex]) {
            if (++this.sequenceIndex === this.currentSequence.length) {
                if (this.currentSequence === Sequences.CdataEnd) {
                    this.cbs.oncdata(this.sectionStart, this.index, 2);
                }
                else {
                    this.cbs.oncomment(this.sectionStart, this.index, 2);
                }
                this.sequenceIndex = 0;
                this.sectionStart = this.index + 1;
                this.state = State$1.Text;
            }
        }
        else if (this.sequenceIndex === 0) {
            // Fast-forward to the first character of the sequence
            if (this.fastForwardTo(this.currentSequence[0])) {
                this.sequenceIndex = 1;
            }
        }
        else if (c !== this.currentSequence[this.sequenceIndex - 1]) {
            // Allow long sequences, eg. --->, ]]]>
            this.sequenceIndex = 0;
        }
    }
    /**
     * HTML only allows ASCII alpha characters (a-z and A-Z) at the beginning of a tag name.
     *
     * XML allows a lot more characters here (@see https://www.w3.org/TR/REC-xml/#NT-NameStartChar).
     * We allow anything that wouldn't end the tag.
     */
    isTagStartChar(c) {
        return this.xmlMode ? !isEndOfTagSection(c) : isASCIIAlpha(c);
    }
    startSpecial(sequence, offset) {
        this.isSpecial = true;
        this.currentSequence = sequence;
        this.sequenceIndex = offset;
        this.state = State$1.SpecialStartSequence;
    }
    stateBeforeTagName(c) {
        if (c === CharCodes$1.ExclamationMark) {
            this.state = State$1.BeforeDeclaration;
            this.sectionStart = this.index + 1;
        }
        else if (c === CharCodes$1.Questionmark) {
            this.state = State$1.InProcessingInstruction;
            this.sectionStart = this.index + 1;
        }
        else if (this.isTagStartChar(c)) {
            const lower = c | 0x20;
            this.sectionStart = this.index;
            if (this.xmlMode) {
                this.state = State$1.InTagName;
            }
            else if (lower === Sequences.ScriptEnd[2]) {
                this.state = State$1.BeforeSpecialS;
            }
            else if (lower === Sequences.TitleEnd[2] ||
                lower === Sequences.XmpEnd[2]) {
                this.state = State$1.BeforeSpecialT;
            }
            else {
                this.state = State$1.InTagName;
            }
        }
        else if (c === CharCodes$1.Slash) {
            this.state = State$1.BeforeClosingTagName;
        }
        else {
            this.state = State$1.Text;
            this.stateText(c);
        }
    }
    stateInTagName(c) {
        if (isEndOfTagSection(c)) {
            this.cbs.onopentagname(this.sectionStart, this.index);
            this.sectionStart = -1;
            this.state = State$1.BeforeAttributeName;
            this.stateBeforeAttributeName(c);
        }
    }
    stateBeforeClosingTagName(c) {
        if (isWhitespace$2(c)) ;
        else if (c === CharCodes$1.Gt) {
            this.state = State$1.Text;
        }
        else {
            this.state = this.isTagStartChar(c)
                ? State$1.InClosingTagName
                : State$1.InSpecialComment;
            this.sectionStart = this.index;
        }
    }
    stateInClosingTagName(c) {
        if (c === CharCodes$1.Gt || isWhitespace$2(c)) {
            this.cbs.onclosetag(this.sectionStart, this.index);
            this.sectionStart = -1;
            this.state = State$1.AfterClosingTagName;
            this.stateAfterClosingTagName(c);
        }
    }
    stateAfterClosingTagName(c) {
        // Skip everything until ">"
        if (c === CharCodes$1.Gt || this.fastForwardTo(CharCodes$1.Gt)) {
            this.state = State$1.Text;
            this.sectionStart = this.index + 1;
        }
    }
    stateBeforeAttributeName(c) {
        if (c === CharCodes$1.Gt) {
            this.cbs.onopentagend(this.index);
            if (this.isSpecial) {
                this.state = State$1.InSpecialTag;
                this.sequenceIndex = 0;
            }
            else {
                this.state = State$1.Text;
            }
            this.sectionStart = this.index + 1;
        }
        else if (c === CharCodes$1.Slash) {
            this.state = State$1.InSelfClosingTag;
        }
        else if (!isWhitespace$2(c)) {
            this.state = State$1.InAttributeName;
            this.sectionStart = this.index;
        }
    }
    stateInSelfClosingTag(c) {
        if (c === CharCodes$1.Gt) {
            this.cbs.onselfclosingtag(this.index);
            this.state = State$1.Text;
            this.sectionStart = this.index + 1;
            this.isSpecial = false; // Reset special state, in case of self-closing special tags
        }
        else if (!isWhitespace$2(c)) {
            this.state = State$1.BeforeAttributeName;
            this.stateBeforeAttributeName(c);
        }
    }
    stateInAttributeName(c) {
        if (c === CharCodes$1.Eq || isEndOfTagSection(c)) {
            this.cbs.onattribname(this.sectionStart, this.index);
            this.sectionStart = this.index;
            this.state = State$1.AfterAttributeName;
            this.stateAfterAttributeName(c);
        }
    }
    stateAfterAttributeName(c) {
        if (c === CharCodes$1.Eq) {
            this.state = State$1.BeforeAttributeValue;
        }
        else if (c === CharCodes$1.Slash || c === CharCodes$1.Gt) {
            this.cbs.onattribend(QuoteType.NoValue, this.sectionStart);
            this.sectionStart = -1;
            this.state = State$1.BeforeAttributeName;
            this.stateBeforeAttributeName(c);
        }
        else if (!isWhitespace$2(c)) {
            this.cbs.onattribend(QuoteType.NoValue, this.sectionStart);
            this.state = State$1.InAttributeName;
            this.sectionStart = this.index;
        }
    }
    stateBeforeAttributeValue(c) {
        if (c === CharCodes$1.DoubleQuote) {
            this.state = State$1.InAttributeValueDq;
            this.sectionStart = this.index + 1;
        }
        else if (c === CharCodes$1.SingleQuote) {
            this.state = State$1.InAttributeValueSq;
            this.sectionStart = this.index + 1;
        }
        else if (!isWhitespace$2(c)) {
            this.sectionStart = this.index;
            this.state = State$1.InAttributeValueNq;
            this.stateInAttributeValueNoQuotes(c); // Reconsume token
        }
    }
    handleInAttributeValue(c, quote) {
        if (c === quote ||
            (!this.decodeEntities && this.fastForwardTo(quote))) {
            this.cbs.onattribdata(this.sectionStart, this.index);
            this.sectionStart = -1;
            this.cbs.onattribend(quote === CharCodes$1.DoubleQuote
                ? QuoteType.Double
                : QuoteType.Single, this.index + 1);
            this.state = State$1.BeforeAttributeName;
        }
        else if (this.decodeEntities && c === CharCodes$1.Amp) {
            this.startEntity();
        }
    }
    stateInAttributeValueDoubleQuotes(c) {
        this.handleInAttributeValue(c, CharCodes$1.DoubleQuote);
    }
    stateInAttributeValueSingleQuotes(c) {
        this.handleInAttributeValue(c, CharCodes$1.SingleQuote);
    }
    stateInAttributeValueNoQuotes(c) {
        if (isWhitespace$2(c) || c === CharCodes$1.Gt) {
            this.cbs.onattribdata(this.sectionStart, this.index);
            this.sectionStart = -1;
            this.cbs.onattribend(QuoteType.Unquoted, this.index);
            this.state = State$1.BeforeAttributeName;
            this.stateBeforeAttributeName(c);
        }
        else if (this.decodeEntities && c === CharCodes$1.Amp) {
            this.startEntity();
        }
    }
    stateBeforeDeclaration(c) {
        if (c === CharCodes$1.OpeningSquareBracket) {
            this.state = State$1.CDATASequence;
            this.sequenceIndex = 0;
        }
        else {
            this.state =
                c === CharCodes$1.Dash
                    ? State$1.BeforeComment
                    : State$1.InDeclaration;
        }
    }
    stateInDeclaration(c) {
        if (c === CharCodes$1.Gt || this.fastForwardTo(CharCodes$1.Gt)) {
            this.cbs.ondeclaration(this.sectionStart, this.index);
            this.state = State$1.Text;
            this.sectionStart = this.index + 1;
        }
    }
    stateInProcessingInstruction(c) {
        if (c === CharCodes$1.Gt || this.fastForwardTo(CharCodes$1.Gt)) {
            this.cbs.onprocessinginstruction(this.sectionStart, this.index);
            this.state = State$1.Text;
            this.sectionStart = this.index + 1;
        }
    }
    stateBeforeComment(c) {
        if (c === CharCodes$1.Dash) {
            this.state = State$1.InCommentLike;
            this.currentSequence = Sequences.CommentEnd;
            // Allow short comments (eg. <!-->)
            this.sequenceIndex = 2;
            this.sectionStart = this.index + 1;
        }
        else {
            this.state = State$1.InDeclaration;
        }
    }
    stateInSpecialComment(c) {
        if (c === CharCodes$1.Gt || this.fastForwardTo(CharCodes$1.Gt)) {
            this.cbs.oncomment(this.sectionStart, this.index, 0);
            this.state = State$1.Text;
            this.sectionStart = this.index + 1;
        }
    }
    stateBeforeSpecialS(c) {
        const lower = c | 0x20;
        if (lower === Sequences.ScriptEnd[3]) {
            this.startSpecial(Sequences.ScriptEnd, 4);
        }
        else if (lower === Sequences.StyleEnd[3]) {
            this.startSpecial(Sequences.StyleEnd, 4);
        }
        else {
            this.state = State$1.InTagName;
            this.stateInTagName(c); // Consume the token again
        }
    }
    stateBeforeSpecialT(c) {
        const lower = c | 0x20;
        switch (lower) {
            case Sequences.TitleEnd[3]: {
                this.startSpecial(Sequences.TitleEnd, 4);
                break;
            }
            case Sequences.TextareaEnd[3]: {
                this.startSpecial(Sequences.TextareaEnd, 4);
                break;
            }
            case Sequences.XmpEnd[3]: {
                this.startSpecial(Sequences.XmpEnd, 4);
                break;
            }
            default: {
                this.state = State$1.InTagName;
                this.stateInTagName(c); // Consume the token again
            }
        }
    }
    startEntity() {
        this.baseState = this.state;
        this.state = State$1.InEntity;
        this.entityStart = this.index;
        this.entityDecoder.startEntity(this.xmlMode
            ? DecodingMode$1.Strict
            : this.baseState === State$1.Text ||
                this.baseState === State$1.InSpecialTag
                ? DecodingMode$1.Legacy
                : DecodingMode$1.Attribute);
    }
    stateInEntity() {
        const length = this.entityDecoder.write(this.buffer, this.index - this.offset);
        // If `length` is positive, we are done with the entity.
        if (length >= 0) {
            this.state = this.baseState;
            if (length === 0) {
                this.index = this.entityStart;
            }
        }
        else {
            // Mark buffer as consumed.
            this.index = this.offset + this.buffer.length - 1;
        }
    }
    /**
     * Remove data that has already been consumed from the buffer.
     */
    cleanup() {
        // If we are inside of text or attributes, emit what we already have.
        if (this.running && this.sectionStart !== this.index) {
            if (this.state === State$1.Text ||
                (this.state === State$1.InSpecialTag && this.sequenceIndex === 0)) {
                this.cbs.ontext(this.sectionStart, this.index);
                this.sectionStart = this.index;
            }
            else if (this.state === State$1.InAttributeValueDq ||
                this.state === State$1.InAttributeValueSq ||
                this.state === State$1.InAttributeValueNq) {
                this.cbs.onattribdata(this.sectionStart, this.index);
                this.sectionStart = this.index;
            }
        }
    }
    shouldContinue() {
        return this.index < this.buffer.length + this.offset && this.running;
    }
    /**
     * Iterates through the buffer, calling the function corresponding to the current state.
     *
     * States that are more likely to be hit are higher up, as a performance improvement.
     */
    parse() {
        while (this.shouldContinue()) {
            const c = this.buffer.charCodeAt(this.index - this.offset);
            switch (this.state) {
                case State$1.Text: {
                    this.stateText(c);
                    break;
                }
                case State$1.SpecialStartSequence: {
                    this.stateSpecialStartSequence(c);
                    break;
                }
                case State$1.InSpecialTag: {
                    this.stateInSpecialTag(c);
                    break;
                }
                case State$1.CDATASequence: {
                    this.stateCDATASequence(c);
                    break;
                }
                case State$1.InAttributeValueDq: {
                    this.stateInAttributeValueDoubleQuotes(c);
                    break;
                }
                case State$1.InAttributeName: {
                    this.stateInAttributeName(c);
                    break;
                }
                case State$1.InCommentLike: {
                    this.stateInCommentLike(c);
                    break;
                }
                case State$1.InSpecialComment: {
                    this.stateInSpecialComment(c);
                    break;
                }
                case State$1.BeforeAttributeName: {
                    this.stateBeforeAttributeName(c);
                    break;
                }
                case State$1.InTagName: {
                    this.stateInTagName(c);
                    break;
                }
                case State$1.InClosingTagName: {
                    this.stateInClosingTagName(c);
                    break;
                }
                case State$1.BeforeTagName: {
                    this.stateBeforeTagName(c);
                    break;
                }
                case State$1.AfterAttributeName: {
                    this.stateAfterAttributeName(c);
                    break;
                }
                case State$1.InAttributeValueSq: {
                    this.stateInAttributeValueSingleQuotes(c);
                    break;
                }
                case State$1.BeforeAttributeValue: {
                    this.stateBeforeAttributeValue(c);
                    break;
                }
                case State$1.BeforeClosingTagName: {
                    this.stateBeforeClosingTagName(c);
                    break;
                }
                case State$1.AfterClosingTagName: {
                    this.stateAfterClosingTagName(c);
                    break;
                }
                case State$1.BeforeSpecialS: {
                    this.stateBeforeSpecialS(c);
                    break;
                }
                case State$1.BeforeSpecialT: {
                    this.stateBeforeSpecialT(c);
                    break;
                }
                case State$1.InAttributeValueNq: {
                    this.stateInAttributeValueNoQuotes(c);
                    break;
                }
                case State$1.InSelfClosingTag: {
                    this.stateInSelfClosingTag(c);
                    break;
                }
                case State$1.InDeclaration: {
                    this.stateInDeclaration(c);
                    break;
                }
                case State$1.BeforeDeclaration: {
                    this.stateBeforeDeclaration(c);
                    break;
                }
                case State$1.BeforeComment: {
                    this.stateBeforeComment(c);
                    break;
                }
                case State$1.InProcessingInstruction: {
                    this.stateInProcessingInstruction(c);
                    break;
                }
                case State$1.InEntity: {
                    this.stateInEntity();
                    break;
                }
            }
            this.index++;
        }
        this.cleanup();
    }
    finish() {
        if (this.state === State$1.InEntity) {
            this.entityDecoder.end();
            this.state = this.baseState;
        }
        this.handleTrailingData();
        this.cbs.onend();
    }
    /** Handle any trailing data. */
    handleTrailingData() {
        const endIndex = this.buffer.length + this.offset;
        // If there is no remaining data, we are done.
        if (this.sectionStart >= endIndex) {
            return;
        }
        if (this.state === State$1.InCommentLike) {
            if (this.currentSequence === Sequences.CdataEnd) {
                this.cbs.oncdata(this.sectionStart, endIndex, 0);
            }
            else {
                this.cbs.oncomment(this.sectionStart, endIndex, 0);
            }
        }
        else if (this.state === State$1.InTagName ||
            this.state === State$1.BeforeAttributeName ||
            this.state === State$1.BeforeAttributeValue ||
            this.state === State$1.AfterAttributeName ||
            this.state === State$1.InAttributeName ||
            this.state === State$1.InAttributeValueSq ||
            this.state === State$1.InAttributeValueDq ||
            this.state === State$1.InAttributeValueNq ||
            this.state === State$1.InClosingTagName) ;
        else {
            this.cbs.ontext(this.sectionStart, endIndex);
        }
    }
    emitCodePoint(cp, consumed) {
        if (this.baseState !== State$1.Text &&
            this.baseState !== State$1.InSpecialTag) {
            if (this.sectionStart < this.entityStart) {
                this.cbs.onattribdata(this.sectionStart, this.entityStart);
            }
            this.sectionStart = this.entityStart + consumed;
            this.index = this.sectionStart - 1;
            this.cbs.onattribentity(cp);
        }
        else {
            if (this.sectionStart < this.entityStart) {
                this.cbs.ontext(this.sectionStart, this.entityStart);
            }
            this.sectionStart = this.entityStart + consumed;
            this.index = this.sectionStart - 1;
            this.cbs.ontextentity(cp, this.sectionStart);
        }
    }
}

const formTags = new Set([
    "input",
    "option",
    "optgroup",
    "select",
    "button",
    "datalist",
    "textarea",
]);
const pTag = new Set(["p"]);
const tableSectionTags = new Set(["thead", "tbody"]);
const ddtTags = new Set(["dd", "dt"]);
const rtpTags = new Set(["rt", "rp"]);
const openImpliesClose = new Map([
    ["tr", new Set(["tr", "th", "td"])],
    ["th", new Set(["th"])],
    ["td", new Set(["thead", "th", "td"])],
    ["body", new Set(["head", "link", "script"])],
    ["li", new Set(["li"])],
    ["p", pTag],
    ["h1", pTag],
    ["h2", pTag],
    ["h3", pTag],
    ["h4", pTag],
    ["h5", pTag],
    ["h6", pTag],
    ["select", formTags],
    ["input", formTags],
    ["output", formTags],
    ["button", formTags],
    ["datalist", formTags],
    ["textarea", formTags],
    ["option", new Set(["option"])],
    ["optgroup", new Set(["optgroup", "option"])],
    ["dd", ddtTags],
    ["dt", ddtTags],
    ["address", pTag],
    ["article", pTag],
    ["aside", pTag],
    ["blockquote", pTag],
    ["details", pTag],
    ["div", pTag],
    ["dl", pTag],
    ["fieldset", pTag],
    ["figcaption", pTag],
    ["figure", pTag],
    ["footer", pTag],
    ["form", pTag],
    ["header", pTag],
    ["hr", pTag],
    ["main", pTag],
    ["nav", pTag],
    ["ol", pTag],
    ["pre", pTag],
    ["section", pTag],
    ["table", pTag],
    ["ul", pTag],
    ["rt", rtpTags],
    ["rp", rtpTags],
    ["tbody", tableSectionTags],
    ["tfoot", tableSectionTags],
]);
const voidElements = new Set([
    "area",
    "base",
    "basefont",
    "br",
    "col",
    "command",
    "embed",
    "frame",
    "hr",
    "img",
    "input",
    "isindex",
    "keygen",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
]);
const foreignContextElements = new Set(["math", "svg"]);
const htmlIntegrationElements = new Set([
    "mi",
    "mo",
    "mn",
    "ms",
    "mtext",
    "annotation-xml",
    "foreignobject",
    "desc",
    "title",
]);
const reNameEnd = /\s|\//;
class Parser$1 {
    constructor(cbs, options = {}) {
        var _a, _b, _c, _d, _e, _f;
        this.options = options;
        /** The start index of the last event. */
        this.startIndex = 0;
        /** The end index of the last event. */
        this.endIndex = 0;
        /**
         * Store the start index of the current open tag,
         * so we can update the start index for attributes.
         */
        this.openTagStart = 0;
        this.tagname = "";
        this.attribname = "";
        this.attribvalue = "";
        this.attribs = null;
        this.stack = [];
        this.buffers = [];
        this.bufferOffset = 0;
        /** The index of the last written buffer. Used when resuming after a `pause()`. */
        this.writeIndex = 0;
        /** Indicates whether the parser has finished running / `.end` has been called. */
        this.ended = false;
        this.cbs = cbs !== null && cbs !== void 0 ? cbs : {};
        this.htmlMode = !this.options.xmlMode;
        this.lowerCaseTagNames = (_a = options.lowerCaseTags) !== null && _a !== void 0 ? _a : this.htmlMode;
        this.lowerCaseAttributeNames =
            (_b = options.lowerCaseAttributeNames) !== null && _b !== void 0 ? _b : this.htmlMode;
        this.recognizeSelfClosing =
            (_c = options.recognizeSelfClosing) !== null && _c !== void 0 ? _c : !this.htmlMode;
        this.tokenizer = new ((_d = options.Tokenizer) !== null && _d !== void 0 ? _d : Tokenizer$1)(this.options, this);
        this.foreignContext = [!this.htmlMode];
        (_f = (_e = this.cbs).onparserinit) === null || _f === void 0 ? void 0 : _f.call(_e, this);
    }
    // Tokenizer event handlers
    /** @internal */
    ontext(start, endIndex) {
        var _a, _b;
        const data = this.getSlice(start, endIndex);
        this.endIndex = endIndex - 1;
        (_b = (_a = this.cbs).ontext) === null || _b === void 0 ? void 0 : _b.call(_a, data);
        this.startIndex = endIndex;
    }
    /** @internal */
    ontextentity(cp, endIndex) {
        var _a, _b;
        this.endIndex = endIndex - 1;
        (_b = (_a = this.cbs).ontext) === null || _b === void 0 ? void 0 : _b.call(_a, fromCodePoint(cp));
        this.startIndex = endIndex;
    }
    /**
     * Checks if the current tag is a void element. Override this if you want
     * to specify your own additional void elements.
     */
    isVoidElement(name) {
        return this.htmlMode && voidElements.has(name);
    }
    /** @internal */
    onopentagname(start, endIndex) {
        this.endIndex = endIndex;
        let name = this.getSlice(start, endIndex);
        if (this.lowerCaseTagNames) {
            name = name.toLowerCase();
        }
        this.emitOpenTag(name);
    }
    emitOpenTag(name) {
        var _a, _b, _c, _d;
        this.openTagStart = this.startIndex;
        this.tagname = name;
        const impliesClose = this.htmlMode && openImpliesClose.get(name);
        if (impliesClose) {
            while (this.stack.length > 0 && impliesClose.has(this.stack[0])) {
                const element = this.stack.shift();
                (_b = (_a = this.cbs).onclosetag) === null || _b === void 0 ? void 0 : _b.call(_a, element, true);
            }
        }
        if (!this.isVoidElement(name)) {
            this.stack.unshift(name);
            if (this.htmlMode) {
                if (foreignContextElements.has(name)) {
                    this.foreignContext.unshift(true);
                }
                else if (htmlIntegrationElements.has(name)) {
                    this.foreignContext.unshift(false);
                }
            }
        }
        (_d = (_c = this.cbs).onopentagname) === null || _d === void 0 ? void 0 : _d.call(_c, name);
        if (this.cbs.onopentag)
            this.attribs = {};
    }
    endOpenTag(isImplied) {
        var _a, _b;
        this.startIndex = this.openTagStart;
        if (this.attribs) {
            (_b = (_a = this.cbs).onopentag) === null || _b === void 0 ? void 0 : _b.call(_a, this.tagname, this.attribs, isImplied);
            this.attribs = null;
        }
        if (this.cbs.onclosetag && this.isVoidElement(this.tagname)) {
            this.cbs.onclosetag(this.tagname, true);
        }
        this.tagname = "";
    }
    /** @internal */
    onopentagend(endIndex) {
        this.endIndex = endIndex;
        this.endOpenTag(false);
        // Set `startIndex` for next node
        this.startIndex = endIndex + 1;
    }
    /** @internal */
    onclosetag(start, endIndex) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        this.endIndex = endIndex;
        let name = this.getSlice(start, endIndex);
        if (this.lowerCaseTagNames) {
            name = name.toLowerCase();
        }
        if (this.htmlMode &&
            (foreignContextElements.has(name) ||
                htmlIntegrationElements.has(name))) {
            this.foreignContext.shift();
        }
        if (!this.isVoidElement(name)) {
            const pos = this.stack.indexOf(name);
            if (pos !== -1) {
                for (let index = 0; index <= pos; index++) {
                    const element = this.stack.shift();
                    // We know the stack has sufficient elements.
                    (_b = (_a = this.cbs).onclosetag) === null || _b === void 0 ? void 0 : _b.call(_a, element, index !== pos);
                }
            }
            else if (this.htmlMode && name === "p") {
                // Implicit open before close
                this.emitOpenTag("p");
                this.closeCurrentTag(true);
            }
        }
        else if (this.htmlMode && name === "br") {
            // We can't use `emitOpenTag` for implicit open, as `br` would be implicitly closed.
            (_d = (_c = this.cbs).onopentagname) === null || _d === void 0 ? void 0 : _d.call(_c, "br");
            (_f = (_e = this.cbs).onopentag) === null || _f === void 0 ? void 0 : _f.call(_e, "br", {}, true);
            (_h = (_g = this.cbs).onclosetag) === null || _h === void 0 ? void 0 : _h.call(_g, "br", false);
        }
        // Set `startIndex` for next node
        this.startIndex = endIndex + 1;
    }
    /** @internal */
    onselfclosingtag(endIndex) {
        this.endIndex = endIndex;
        if (this.recognizeSelfClosing || this.foreignContext[0]) {
            this.closeCurrentTag(false);
            // Set `startIndex` for next node
            this.startIndex = endIndex + 1;
        }
        else {
            // Ignore the fact that the tag is self-closing.
            this.onopentagend(endIndex);
        }
    }
    closeCurrentTag(isOpenImplied) {
        var _a, _b;
        const name = this.tagname;
        this.endOpenTag(isOpenImplied);
        // Self-closing tags will be on the top of the stack
        if (this.stack[0] === name) {
            // If the opening tag isn't implied, the closing tag has to be implied.
            (_b = (_a = this.cbs).onclosetag) === null || _b === void 0 ? void 0 : _b.call(_a, name, !isOpenImplied);
            this.stack.shift();
        }
    }
    /** @internal */
    onattribname(start, endIndex) {
        this.startIndex = start;
        const name = this.getSlice(start, endIndex);
        this.attribname = this.lowerCaseAttributeNames
            ? name.toLowerCase()
            : name;
    }
    /** @internal */
    onattribdata(start, endIndex) {
        this.attribvalue += this.getSlice(start, endIndex);
    }
    /** @internal */
    onattribentity(cp) {
        this.attribvalue += fromCodePoint(cp);
    }
    /** @internal */
    onattribend(quote, endIndex) {
        var _a, _b;
        this.endIndex = endIndex;
        (_b = (_a = this.cbs).onattribute) === null || _b === void 0 ? void 0 : _b.call(_a, this.attribname, this.attribvalue, quote === QuoteType.Double
            ? '"'
            : quote === QuoteType.Single
                ? "'"
                : quote === QuoteType.NoValue
                    ? undefined
                    : null);
        if (this.attribs &&
            !Object.prototype.hasOwnProperty.call(this.attribs, this.attribname)) {
            this.attribs[this.attribname] = this.attribvalue;
        }
        this.attribvalue = "";
    }
    getInstructionName(value) {
        const index = value.search(reNameEnd);
        let name = index < 0 ? value : value.substr(0, index);
        if (this.lowerCaseTagNames) {
            name = name.toLowerCase();
        }
        return name;
    }
    /** @internal */
    ondeclaration(start, endIndex) {
        this.endIndex = endIndex;
        const value = this.getSlice(start, endIndex);
        if (this.cbs.onprocessinginstruction) {
            const name = this.getInstructionName(value);
            this.cbs.onprocessinginstruction(`!${name}`, `!${value}`);
        }
        // Set `startIndex` for next node
        this.startIndex = endIndex + 1;
    }
    /** @internal */
    onprocessinginstruction(start, endIndex) {
        this.endIndex = endIndex;
        const value = this.getSlice(start, endIndex);
        if (this.cbs.onprocessinginstruction) {
            const name = this.getInstructionName(value);
            this.cbs.onprocessinginstruction(`?${name}`, `?${value}`);
        }
        // Set `startIndex` for next node
        this.startIndex = endIndex + 1;
    }
    /** @internal */
    oncomment(start, endIndex, offset) {
        var _a, _b, _c, _d;
        this.endIndex = endIndex;
        (_b = (_a = this.cbs).oncomment) === null || _b === void 0 ? void 0 : _b.call(_a, this.getSlice(start, endIndex - offset));
        (_d = (_c = this.cbs).oncommentend) === null || _d === void 0 ? void 0 : _d.call(_c);
        // Set `startIndex` for next node
        this.startIndex = endIndex + 1;
    }
    /** @internal */
    oncdata(start, endIndex, offset) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        this.endIndex = endIndex;
        const value = this.getSlice(start, endIndex - offset);
        if (!this.htmlMode || this.options.recognizeCDATA) {
            (_b = (_a = this.cbs).oncdatastart) === null || _b === void 0 ? void 0 : _b.call(_a);
            (_d = (_c = this.cbs).ontext) === null || _d === void 0 ? void 0 : _d.call(_c, value);
            (_f = (_e = this.cbs).oncdataend) === null || _f === void 0 ? void 0 : _f.call(_e);
        }
        else {
            (_h = (_g = this.cbs).oncomment) === null || _h === void 0 ? void 0 : _h.call(_g, `[CDATA[${value}]]`);
            (_k = (_j = this.cbs).oncommentend) === null || _k === void 0 ? void 0 : _k.call(_j);
        }
        // Set `startIndex` for next node
        this.startIndex = endIndex + 1;
    }
    /** @internal */
    onend() {
        var _a, _b;
        if (this.cbs.onclosetag) {
            // Set the end index for all remaining tags
            this.endIndex = this.startIndex;
            for (let index = 0; index < this.stack.length; index++) {
                this.cbs.onclosetag(this.stack[index], true);
            }
        }
        (_b = (_a = this.cbs).onend) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    /**
     * Resets the parser to a blank state, ready to parse a new HTML document
     */
    reset() {
        var _a, _b, _c, _d;
        (_b = (_a = this.cbs).onreset) === null || _b === void 0 ? void 0 : _b.call(_a);
        this.tokenizer.reset();
        this.tagname = "";
        this.attribname = "";
        this.attribs = null;
        this.stack.length = 0;
        this.startIndex = 0;
        this.endIndex = 0;
        (_d = (_c = this.cbs).onparserinit) === null || _d === void 0 ? void 0 : _d.call(_c, this);
        this.buffers.length = 0;
        this.foreignContext.length = 0;
        this.foreignContext.unshift(!this.htmlMode);
        this.bufferOffset = 0;
        this.writeIndex = 0;
        this.ended = false;
    }
    /**
     * Resets the parser, then parses a complete document and
     * pushes it to the handler.
     *
     * @param data Document to parse.
     */
    parseComplete(data) {
        this.reset();
        this.end(data);
    }
    getSlice(start, end) {
        while (start - this.bufferOffset >= this.buffers[0].length) {
            this.shiftBuffer();
        }
        let slice = this.buffers[0].slice(start - this.bufferOffset, end - this.bufferOffset);
        while (end - this.bufferOffset > this.buffers[0].length) {
            this.shiftBuffer();
            slice += this.buffers[0].slice(0, end - this.bufferOffset);
        }
        return slice;
    }
    shiftBuffer() {
        this.bufferOffset += this.buffers[0].length;
        this.writeIndex--;
        this.buffers.shift();
    }
    /**
     * Parses a chunk of data and calls the corresponding callbacks.
     *
     * @param chunk Chunk to parse.
     */
    write(chunk) {
        var _a, _b;
        if (this.ended) {
            (_b = (_a = this.cbs).onerror) === null || _b === void 0 ? void 0 : _b.call(_a, new Error(".write() after done!"));
            return;
        }
        this.buffers.push(chunk);
        if (this.tokenizer.running) {
            this.tokenizer.write(chunk);
            this.writeIndex++;
        }
    }
    /**
     * Parses the end of the buffer and clears the stack, calls onend.
     *
     * @param chunk Optional final chunk to parse.
     */
    end(chunk) {
        var _a, _b;
        if (this.ended) {
            (_b = (_a = this.cbs).onerror) === null || _b === void 0 ? void 0 : _b.call(_a, new Error(".end() after done!"));
            return;
        }
        if (chunk)
            this.write(chunk);
        this.ended = true;
        this.tokenizer.end();
    }
    /**
     * Pauses parsing. The parser won't emit events until `resume` is called.
     */
    pause() {
        this.tokenizer.pause();
    }
    /**
     * Resumes parsing after `pause` was called.
     */
    resume() {
        this.tokenizer.resume();
        while (this.tokenizer.running &&
            this.writeIndex < this.buffers.length) {
            this.tokenizer.write(this.buffers[this.writeIndex++]);
        }
        if (this.ended)
            this.tokenizer.end();
    }
    /**
     * Alias of `write`, for backwards compatibility.
     *
     * @param chunk Chunk to parse.
     * @deprecated
     */
    parseChunk(chunk) {
        this.write(chunk);
    }
    /**
     * Alias of `end`, for backwards compatibility.
     *
     * @param chunk Optional final chunk to parse.
     * @deprecated
     */
    done(chunk) {
        this.end(chunk);
    }
}

// Helper methods
/**
 * Parses the data, returns the resulting document.
 *
 * @param data The data that should be parsed.
 * @param options Optional options for the parser and DOM handler.
 */
function parseDocument(data, options) {
    const handler = new DomHandler(undefined, options);
    new Parser$1(handler, options).end(data);
    return handler.root;
}

/**
 * Methods for getting and modifying attributes.
 *
 * @module cheerio/attributes
 */
var _a;
const hasOwn = 
// @ts-expect-error `hasOwn` is a standard object method
(_a = Object.hasOwn) !== null && _a !== void 0 ? _a : ((object, prop) => Object.prototype.hasOwnProperty.call(object, prop));
const rspace = /\s+/;
const dataAttrPrefix = 'data-';
// Attributes that are booleans
const rboolean = /^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i;
// Matches strings that look like JSON objects or arrays
const rbrace = /^{[^]*}$|^\[[^]*]$/;
function getAttr(elem, name, xmlMode) {
    var _a;
    if (!elem || !isTag(elem))
        return undefined;
    (_a = elem.attribs) !== null && _a !== void 0 ? _a : (elem.attribs = {});
    // Return the entire attribs object if no attribute specified
    if (!name) {
        return elem.attribs;
    }
    if (hasOwn(elem.attribs, name)) {
        // Get the (decoded) attribute
        return !xmlMode && rboolean.test(name) ? name : elem.attribs[name];
    }
    // Mimic the DOM and return text content as value for `option's`
    if (elem.name === 'option' && name === 'value') {
        return text$1(elem.children);
    }
    // Mimic DOM with default value for radios/checkboxes
    if (elem.name === 'input' &&
        (elem.attribs['type'] === 'radio' || elem.attribs['type'] === 'checkbox') &&
        name === 'value') {
        return 'on';
    }
    return undefined;
}
/**
 * Sets the value of an attribute. The attribute will be deleted if the value is
 * `null`.
 *
 * @private
 * @param el - The element to set the attribute on.
 * @param name - The attribute's name.
 * @param value - The attribute's value.
 */
function setAttr(el, name, value) {
    if (value === null) {
        removeAttribute(el, name);
    }
    else {
        el.attribs[name] = `${value}`;
    }
}
function attr(name, value) {
    // Set the value (with attr map support)
    if (typeof name === 'object' || value !== undefined) {
        if (typeof value === 'function') {
            if (typeof name !== 'string') {
                {
                    throw new Error('Bad combination of arguments.');
                }
            }
            return domEach(this, (el, i) => {
                if (isTag(el))
                    setAttr(el, name, value.call(el, i, el.attribs[name]));
            });
        }
        return domEach(this, (el) => {
            if (!isTag(el))
                return;
            if (typeof name === 'object') {
                for (const objName of Object.keys(name)) {
                    const objValue = name[objName];
                    setAttr(el, objName, objValue);
                }
            }
            else {
                setAttr(el, name, value);
            }
        });
    }
    return arguments.length > 1
        ? this
        : getAttr(this[0], name, this.options.xmlMode);
}
/**
 * Gets a node's prop.
 *
 * @private
 * @category Attributes
 * @param el - Element to get the prop of.
 * @param name - Name of the prop.
 * @param xmlMode - Disable handling of special HTML attributes.
 * @returns The prop's value.
 */
function getProp(el, name, xmlMode) {
    return name in el
        ? // @ts-expect-error TS doesn't like us accessing the value directly here.
            el[name]
        : !xmlMode && rboolean.test(name)
            ? getAttr(el, name, false) !== undefined
            : getAttr(el, name, xmlMode);
}
/**
 * Sets the value of a prop.
 *
 * @private
 * @param el - The element to set the prop on.
 * @param name - The prop's name.
 * @param value - The prop's value.
 * @param xmlMode - Disable handling of special HTML attributes.
 */
function setProp(el, name, value, xmlMode) {
    if (name in el) {
        // @ts-expect-error Overriding value
        el[name] = value;
    }
    else {
        setAttr(el, name, !xmlMode && rboolean.test(name)
            ? value
                ? ''
                : null
            : `${value}`);
    }
}
function prop(name, value) {
    var _a;
    if (typeof name === 'string' && value === undefined) {
        const el = this[0];
        if (!el)
            return undefined;
        switch (name) {
            case 'style': {
                const property = this.css();
                const keys = Object.keys(property);
                for (let i = 0; i < keys.length; i++) {
                    property[i] = keys[i];
                }
                property.length = keys.length;
                return property;
            }
            case 'tagName':
            case 'nodeName': {
                if (!isTag(el))
                    return undefined;
                return el.name.toUpperCase();
            }
            case 'href':
            case 'src': {
                if (!isTag(el))
                    return undefined;
                const prop = (_a = el.attribs) === null || _a === void 0 ? void 0 : _a[name];
                if (typeof URL !== 'undefined' &&
                    ((name === 'href' && (el.tagName === 'a' || el.tagName === 'link')) ||
                        (name === 'src' &&
                            (el.tagName === 'img' ||
                                el.tagName === 'iframe' ||
                                el.tagName === 'audio' ||
                                el.tagName === 'video' ||
                                el.tagName === 'source'))) &&
                    prop !== undefined &&
                    this.options.baseURI) {
                    return new URL(prop, this.options.baseURI).href;
                }
                return prop;
            }
            case 'innerText': {
                return innerText(el);
            }
            case 'textContent': {
                return textContent(el);
            }
            case 'outerHTML': {
                if (el.type === Root)
                    return this.html();
                return this.clone().wrap('<container />').parent().html();
            }
            case 'innerHTML': {
                return this.html();
            }
            default: {
                if (!isTag(el))
                    return undefined;
                return getProp(el, name, this.options.xmlMode);
            }
        }
    }
    if (typeof name === 'object' || value !== undefined) {
        if (typeof value === 'function') {
            if (typeof name === 'object') {
                throw new TypeError('Bad combination of arguments.');
            }
            return domEach(this, (el, i) => {
                if (isTag(el)) {
                    setProp(el, name, value.call(el, i, getProp(el, name, this.options.xmlMode)), this.options.xmlMode);
                }
            });
        }
        return domEach(this, (el) => {
            if (!isTag(el))
                return;
            if (typeof name === 'object') {
                for (const key of Object.keys(name)) {
                    const val = name[key];
                    setProp(el, key, val, this.options.xmlMode);
                }
            }
            else {
                setProp(el, name, value, this.options.xmlMode);
            }
        });
    }
    return undefined;
}
/**
 * Sets the value of a data attribute.
 *
 * @private
 * @param elem - The element to set the data attribute on.
 * @param name - The data attribute's name.
 * @param value - The data attribute's value.
 */
function setData(elem, name, value) {
    var _a;
    (_a = elem.data) !== null && _a !== void 0 ? _a : (elem.data = {});
    if (typeof name === 'object')
        Object.assign(elem.data, name);
    else if (typeof name === 'string' && value !== undefined) {
        elem.data[name] = value;
    }
}
/**
 * Read _all_ HTML5 `data-*` attributes from the equivalent HTML5 `data-*`
 * attribute, and cache the value in the node's internal data store.
 *
 * @private
 * @category Attributes
 * @param el - Element to get the data attribute of.
 * @returns A map with all of the data attributes.
 */
function readAllData(el) {
    for (const domName of Object.keys(el.attribs)) {
        if (!domName.startsWith(dataAttrPrefix)) {
            continue;
        }
        const jsName = camelCase(domName.slice(dataAttrPrefix.length));
        if (!hasOwn(el.data, jsName)) {
            el.data[jsName] = parseDataValue(el.attribs[domName]);
        }
    }
    return el.data;
}
/**
 * Read the specified attribute from the equivalent HTML5 `data-*` attribute,
 * and (if present) cache the value in the node's internal data store.
 *
 * @private
 * @category Attributes
 * @param el - Element to get the data attribute of.
 * @param name - Name of the data attribute.
 * @returns The data attribute's value.
 */
function readData(el, name) {
    const domName = dataAttrPrefix + cssCase(name);
    const data = el.data;
    if (hasOwn(data, name)) {
        return data[name];
    }
    if (hasOwn(el.attribs, domName)) {
        return (data[name] = parseDataValue(el.attribs[domName]));
    }
    return undefined;
}
/**
 * Coerce string data-* attributes to their corresponding JavaScript primitives.
 *
 * @private
 * @category Attributes
 * @param value - The value to parse.
 * @returns The parsed value.
 */
function parseDataValue(value) {
    if (value === 'null')
        return null;
    if (value === 'true')
        return true;
    if (value === 'false')
        return false;
    const num = Number(value);
    if (value === String(num))
        return num;
    if (rbrace.test(value)) {
        try {
            return JSON.parse(value);
        }
        catch {
            /* Ignore */
        }
    }
    return value;
}
function data(name, value) {
    var _a;
    const elem = this[0];
    if (!elem || !isTag(elem))
        return;
    const dataEl = elem;
    (_a = dataEl.data) !== null && _a !== void 0 ? _a : (dataEl.data = {});
    // Return the entire data object if no data specified
    if (name == null) {
        return readAllData(dataEl);
    }
    // Set the value (with attr map support)
    if (typeof name === 'object' || value !== undefined) {
        domEach(this, (el) => {
            if (isTag(el)) {
                if (typeof name === 'object')
                    setData(el, name);
                else
                    setData(el, name, value);
            }
        });
        return this;
    }
    return readData(dataEl, name);
}
function val(value) {
    const querying = arguments.length === 0;
    const element = this[0];
    if (!element || !isTag(element))
        return querying ? undefined : this;
    switch (element.name) {
        case 'textarea': {
            return this.text(value);
        }
        case 'select': {
            const option = this.find('option:selected');
            if (!querying) {
                if (this.attr('multiple') == null && typeof value === 'object') {
                    return this;
                }
                this.find('option').removeAttr('selected');
                const values = typeof value === 'object' ? value : [value];
                for (const val of values) {
                    this.find(`option[value="${val}"]`).attr('selected', '');
                }
                return this;
            }
            return this.attr('multiple')
                ? option.toArray().map((el) => text$1(el.children))
                : option.attr('value');
        }
        case 'input':
        case 'option': {
            return querying
                ? this.attr('value')
                : this.attr('value', value);
        }
    }
    return undefined;
}
/**
 * Remove an attribute.
 *
 * @private
 * @param elem - Node to remove attribute from.
 * @param name - Name of the attribute to remove.
 */
function removeAttribute(elem, name) {
    if (!elem.attribs || !hasOwn(elem.attribs, name))
        return;
    delete elem.attribs[name];
}
/**
 * Splits a space-separated list of names to individual names.
 *
 * @category Attributes
 * @param names - Names to split.
 * @returns - Split names.
 */
function splitNames(names) {
    return names ? names.trim().split(rspace) : [];
}
/**
 * Method for removing attributes by `name`.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('.pear').removeAttr('class').prop('outerHTML');
 * //=> <li>Pear</li>
 *
 * $('.apple').attr('id', 'favorite');
 * $('.apple').removeAttr('id class').prop('outerHTML');
 * //=> <li>Apple</li>
 * ```
 *
 * @param name - Name of the attribute.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/removeAttr/}
 */
function removeAttr(name) {
    const attrNames = splitNames(name);
    for (const attrName of attrNames) {
        domEach(this, (elem) => {
            if (isTag(elem))
                removeAttribute(elem, attrName);
        });
    }
    return this;
}
/**
 * Check to see if _any_ of the matched elements have the given `className`.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('.pear').hasClass('pear');
 * //=> true
 *
 * $('apple').hasClass('fruit');
 * //=> false
 *
 * $('li').hasClass('pear');
 * //=> true
 * ```
 *
 * @param className - Name of the class.
 * @returns Indicates if an element has the given `className`.
 * @see {@link https://api.jquery.com/hasClass/}
 */
function hasClass(className) {
    return this.toArray().some((elem) => {
        const clazz = isTag(elem) && elem.attribs['class'];
        let idx = -1;
        if (clazz && className.length > 0) {
            while ((idx = clazz.indexOf(className, idx + 1)) > -1) {
                const end = idx + className.length;
                if ((idx === 0 || rspace.test(clazz[idx - 1])) &&
                    (end === clazz.length || rspace.test(clazz[end]))) {
                    return true;
                }
            }
        }
        return false;
    });
}
/**
 * Adds class(es) to all of the matched elements. Also accepts a `function`.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('.pear').addClass('fruit').prop('outerHTML');
 * //=> <li class="pear fruit">Pear</li>
 *
 * $('.apple').addClass('fruit red').prop('outerHTML');
 * //=> <li class="apple fruit red">Apple</li>
 * ```
 *
 * @param value - Name of new class.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/addClass/}
 */
function addClass(value) {
    // Support functions
    if (typeof value === 'function') {
        return domEach(this, (el, i) => {
            if (isTag(el)) {
                const className = el.attribs['class'] || '';
                addClass.call([el], value.call(el, i, className));
            }
        });
    }
    // Return if no value or not a string or function
    if (!value || typeof value !== 'string')
        return this;
    const classNames = value.split(rspace);
    const numElements = this.length;
    for (let i = 0; i < numElements; i++) {
        const el = this[i];
        // If selected element isn't a tag, move on
        if (!isTag(el))
            continue;
        // If we don't already have classes — always set xmlMode to false here, as it doesn't matter for classes
        const className = getAttr(el, 'class', false);
        if (className) {
            let setClass = ` ${className} `;
            // Check if class already exists
            for (const cn of classNames) {
                const appendClass = `${cn} `;
                if (!setClass.includes(` ${appendClass}`))
                    setClass += appendClass;
            }
            setAttr(el, 'class', setClass.trim());
        }
        else {
            setAttr(el, 'class', classNames.join(' ').trim());
        }
    }
    return this;
}
/**
 * Removes one or more space-separated classes from the selected elements. If no
 * `className` is defined, all classes will be removed. Also accepts a
 * `function`.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('.pear').removeClass('pear').prop('outerHTML');
 * //=> <li class="">Pear</li>
 *
 * $('.apple').addClass('red').removeClass().prop('outerHTML');
 * //=> <li class="">Apple</li>
 * ```
 *
 * @param name - Name of the class. If not specified, removes all elements.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/removeClass/}
 */
function removeClass(name) {
    // Handle if value is a function
    if (typeof name === 'function') {
        return domEach(this, (el, i) => {
            if (isTag(el)) {
                removeClass.call([el], name.call(el, i, el.attribs['class'] || ''));
            }
        });
    }
    const classes = splitNames(name);
    const numClasses = classes.length;
    const removeAll = arguments.length === 0;
    return domEach(this, (el) => {
        if (!isTag(el))
            return;
        if (removeAll) {
            // Short circuit the remove all case as this is the nice one
            el.attribs['class'] = '';
        }
        else {
            const elClasses = splitNames(el.attribs['class']);
            let changed = false;
            for (let j = 0; j < numClasses; j++) {
                const index = elClasses.indexOf(classes[j]);
                if (index !== -1) {
                    elClasses.splice(index, 1);
                    changed = true;
                    /*
                     * We have to do another pass to ensure that there are not duplicate
                     * classes listed
                     */
                    j--;
                }
            }
            if (changed) {
                el.attribs['class'] = elClasses.join(' ');
            }
        }
    });
}
/**
 * Add or remove class(es) from the matched elements, depending on either the
 * class's presence or the value of the switch argument. Also accepts a
 * `function`.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('.apple.green').toggleClass('fruit green red').prop('outerHTML');
 * //=> <li class="apple fruit red">Apple</li>
 *
 * $('.apple.green').toggleClass('fruit green red', true).prop('outerHTML');
 * //=> <li class="apple green fruit red">Apple</li>
 * ```
 *
 * @param value - Name of the class. Can also be a function.
 * @param stateVal - If specified the state of the class.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/toggleClass/}
 */
function toggleClass(value, stateVal) {
    // Support functions
    if (typeof value === 'function') {
        return domEach(this, (el, i) => {
            if (isTag(el)) {
                toggleClass.call([el], value.call(el, i, el.attribs['class'] || '', stateVal), stateVal);
            }
        });
    }
    // Return if no value or not a string or function
    if (!value || typeof value !== 'string')
        return this;
    const classNames = value.split(rspace);
    const numClasses = classNames.length;
    const state = typeof stateVal === 'boolean' ? (stateVal ? 1 : -1) : 0;
    const numElements = this.length;
    for (let i = 0; i < numElements; i++) {
        const el = this[i];
        // If selected element isn't a tag, move on
        if (!isTag(el))
            continue;
        const elementClasses = splitNames(el.attribs['class']);
        // Check if class already exists
        for (let j = 0; j < numClasses; j++) {
            // Check if the class name is currently defined
            const index = elementClasses.indexOf(classNames[j]);
            // Add if stateValue === true or we are toggling and there is no value
            if (state >= 0 && index === -1) {
                elementClasses.push(classNames[j]);
            }
            else if (state <= 0 && index !== -1) {
                // Otherwise remove but only if the item exists
                elementClasses.splice(index, 1);
            }
        }
        el.attribs['class'] = elementClasses.join(' ');
    }
    return this;
}

var Attributes = /*#__PURE__*/Object.freeze({
    __proto__: null,
    attr: attr,
    prop: prop,
    data: data,
    val: val,
    removeAttr: removeAttr,
    hasClass: hasClass,
    addClass: addClass,
    removeClass: removeClass,
    toggleClass: toggleClass
});

var SelectorType;
(function (SelectorType) {
    SelectorType["Attribute"] = "attribute";
    SelectorType["Pseudo"] = "pseudo";
    SelectorType["PseudoElement"] = "pseudo-element";
    SelectorType["Tag"] = "tag";
    SelectorType["Universal"] = "universal";
    // Traversals
    SelectorType["Adjacent"] = "adjacent";
    SelectorType["Child"] = "child";
    SelectorType["Descendant"] = "descendant";
    SelectorType["Parent"] = "parent";
    SelectorType["Sibling"] = "sibling";
    SelectorType["ColumnCombinator"] = "column-combinator";
})(SelectorType || (SelectorType = {}));
var AttributeAction;
(function (AttributeAction) {
    AttributeAction["Any"] = "any";
    AttributeAction["Element"] = "element";
    AttributeAction["End"] = "end";
    AttributeAction["Equals"] = "equals";
    AttributeAction["Exists"] = "exists";
    AttributeAction["Hyphen"] = "hyphen";
    AttributeAction["Not"] = "not";
    AttributeAction["Start"] = "start";
})(AttributeAction || (AttributeAction = {}));

const reName = /^[^\\#]?(?:\\(?:[\da-f]{1,6}\s?|.)|[\w\-\u00b0-\uFFFF])+/;
const reEscape = /\\([\da-f]{1,6}\s?|(\s)|.)/gi;
const actionTypes = new Map([
    [126 /* Tilde */, AttributeAction.Element],
    [94 /* Circumflex */, AttributeAction.Start],
    [36 /* Dollar */, AttributeAction.End],
    [42 /* Asterisk */, AttributeAction.Any],
    [33 /* ExclamationMark */, AttributeAction.Not],
    [124 /* Pipe */, AttributeAction.Hyphen],
]);
// Pseudos, whose data property is parsed as well.
const unpackPseudos = new Set([
    "has",
    "not",
    "matches",
    "is",
    "where",
    "host",
    "host-context",
]);
/**
 * Checks whether a specific selector is a traversal.
 * This is useful eg. in swapping the order of elements that
 * are not traversals.
 *
 * @param selector Selector to check.
 */
function isTraversal$1(selector) {
    switch (selector.type) {
        case SelectorType.Adjacent:
        case SelectorType.Child:
        case SelectorType.Descendant:
        case SelectorType.Parent:
        case SelectorType.Sibling:
        case SelectorType.ColumnCombinator:
            return true;
        default:
            return false;
    }
}
const stripQuotesFromPseudos = new Set(["contains", "icontains"]);
// Unescape function taken from https://github.com/jquery/sizzle/blob/master/src/sizzle.js#L152
function funescape(_, escaped, escapedWhitespace) {
    const high = parseInt(escaped, 16) - 0x10000;
    // NaN means non-codepoint
    return high !== high || escapedWhitespace
        ? escaped
        : high < 0
            ? // BMP codepoint
                String.fromCharCode(high + 0x10000)
            : // Supplemental Plane codepoint (surrogate pair)
                String.fromCharCode((high >> 10) | 0xd800, (high & 0x3ff) | 0xdc00);
}
function unescapeCSS(str) {
    return str.replace(reEscape, funescape);
}
function isQuote(c) {
    return c === 39 /* SingleQuote */ || c === 34 /* DoubleQuote */;
}
function isWhitespace$1(c) {
    return (c === 32 /* Space */ ||
        c === 9 /* Tab */ ||
        c === 10 /* NewLine */ ||
        c === 12 /* FormFeed */ ||
        c === 13 /* CarriageReturn */);
}
/**
 * Parses `selector`, optionally with the passed `options`.
 *
 * @param selector Selector to parse.
 * @param options Options for parsing.
 * @returns Returns a two-dimensional array.
 * The first dimension represents selectors separated by commas (eg. `sub1, sub2`),
 * the second contains the relevant tokens for that selector.
 */
function parse$4(selector) {
    const subselects = [];
    const endIndex = parseSelector(subselects, `${selector}`, 0);
    if (endIndex < selector.length) {
        throw new Error(`Unmatched selector: ${selector.slice(endIndex)}`);
    }
    return subselects;
}
function parseSelector(subselects, selector, selectorIndex) {
    let tokens = [];
    function getName(offset) {
        const match = selector.slice(selectorIndex + offset).match(reName);
        if (!match) {
            throw new Error(`Expected name, found ${selector.slice(selectorIndex)}`);
        }
        const [name] = match;
        selectorIndex += offset + name.length;
        return unescapeCSS(name);
    }
    function stripWhitespace(offset) {
        selectorIndex += offset;
        while (selectorIndex < selector.length &&
            isWhitespace$1(selector.charCodeAt(selectorIndex))) {
            selectorIndex++;
        }
    }
    function readValueWithParenthesis() {
        selectorIndex += 1;
        const start = selectorIndex;
        let counter = 1;
        for (; counter > 0 && selectorIndex < selector.length; selectorIndex++) {
            if (selector.charCodeAt(selectorIndex) ===
                40 /* LeftParenthesis */ &&
                !isEscaped(selectorIndex)) {
                counter++;
            }
            else if (selector.charCodeAt(selectorIndex) ===
                41 /* RightParenthesis */ &&
                !isEscaped(selectorIndex)) {
                counter--;
            }
        }
        if (counter) {
            throw new Error("Parenthesis not matched");
        }
        return unescapeCSS(selector.slice(start, selectorIndex - 1));
    }
    function isEscaped(pos) {
        let slashCount = 0;
        while (selector.charCodeAt(--pos) === 92 /* BackSlash */)
            slashCount++;
        return (slashCount & 1) === 1;
    }
    function ensureNotTraversal() {
        if (tokens.length > 0 && isTraversal$1(tokens[tokens.length - 1])) {
            throw new Error("Did not expect successive traversals.");
        }
    }
    function addTraversal(type) {
        if (tokens.length > 0 &&
            tokens[tokens.length - 1].type === SelectorType.Descendant) {
            tokens[tokens.length - 1].type = type;
            return;
        }
        ensureNotTraversal();
        tokens.push({ type });
    }
    function addSpecialAttribute(name, action) {
        tokens.push({
            type: SelectorType.Attribute,
            name,
            action,
            value: getName(1),
            namespace: null,
            ignoreCase: "quirks",
        });
    }
    /**
     * We have finished parsing the current part of the selector.
     *
     * Remove descendant tokens at the end if they exist,
     * and return the last index, so that parsing can be
     * picked up from here.
     */
    function finalizeSubselector() {
        if (tokens.length &&
            tokens[tokens.length - 1].type === SelectorType.Descendant) {
            tokens.pop();
        }
        if (tokens.length === 0) {
            throw new Error("Empty sub-selector");
        }
        subselects.push(tokens);
    }
    stripWhitespace(0);
    if (selector.length === selectorIndex) {
        return selectorIndex;
    }
    loop: while (selectorIndex < selector.length) {
        const firstChar = selector.charCodeAt(selectorIndex);
        switch (firstChar) {
            // Whitespace
            case 32 /* Space */:
            case 9 /* Tab */:
            case 10 /* NewLine */:
            case 12 /* FormFeed */:
            case 13 /* CarriageReturn */: {
                if (tokens.length === 0 ||
                    tokens[0].type !== SelectorType.Descendant) {
                    ensureNotTraversal();
                    tokens.push({ type: SelectorType.Descendant });
                }
                stripWhitespace(1);
                break;
            }
            // Traversals
            case 62 /* GreaterThan */: {
                addTraversal(SelectorType.Child);
                stripWhitespace(1);
                break;
            }
            case 60 /* LessThan */: {
                addTraversal(SelectorType.Parent);
                stripWhitespace(1);
                break;
            }
            case 126 /* Tilde */: {
                addTraversal(SelectorType.Sibling);
                stripWhitespace(1);
                break;
            }
            case 43 /* Plus */: {
                addTraversal(SelectorType.Adjacent);
                stripWhitespace(1);
                break;
            }
            // Special attribute selectors: .class, #id
            case 46 /* Period */: {
                addSpecialAttribute("class", AttributeAction.Element);
                break;
            }
            case 35 /* Hash */: {
                addSpecialAttribute("id", AttributeAction.Equals);
                break;
            }
            case 91 /* LeftSquareBracket */: {
                stripWhitespace(1);
                // Determine attribute name and namespace
                let name;
                let namespace = null;
                if (selector.charCodeAt(selectorIndex) === 124 /* Pipe */) {
                    // Equivalent to no namespace
                    name = getName(1);
                }
                else if (selector.startsWith("*|", selectorIndex)) {
                    namespace = "*";
                    name = getName(2);
                }
                else {
                    name = getName(0);
                    if (selector.charCodeAt(selectorIndex) === 124 /* Pipe */ &&
                        selector.charCodeAt(selectorIndex + 1) !==
                            61 /* Equal */) {
                        namespace = name;
                        name = getName(1);
                    }
                }
                stripWhitespace(0);
                // Determine comparison operation
                let action = AttributeAction.Exists;
                const possibleAction = actionTypes.get(selector.charCodeAt(selectorIndex));
                if (possibleAction) {
                    action = possibleAction;
                    if (selector.charCodeAt(selectorIndex + 1) !==
                        61 /* Equal */) {
                        throw new Error("Expected `=`");
                    }
                    stripWhitespace(2);
                }
                else if (selector.charCodeAt(selectorIndex) === 61 /* Equal */) {
                    action = AttributeAction.Equals;
                    stripWhitespace(1);
                }
                // Determine value
                let value = "";
                let ignoreCase = null;
                if (action !== "exists") {
                    if (isQuote(selector.charCodeAt(selectorIndex))) {
                        const quote = selector.charCodeAt(selectorIndex);
                        let sectionEnd = selectorIndex + 1;
                        while (sectionEnd < selector.length &&
                            (selector.charCodeAt(sectionEnd) !== quote ||
                                isEscaped(sectionEnd))) {
                            sectionEnd += 1;
                        }
                        if (selector.charCodeAt(sectionEnd) !== quote) {
                            throw new Error("Attribute value didn't end");
                        }
                        value = unescapeCSS(selector.slice(selectorIndex + 1, sectionEnd));
                        selectorIndex = sectionEnd + 1;
                    }
                    else {
                        const valueStart = selectorIndex;
                        while (selectorIndex < selector.length &&
                            ((!isWhitespace$1(selector.charCodeAt(selectorIndex)) &&
                                selector.charCodeAt(selectorIndex) !==
                                    93 /* RightSquareBracket */) ||
                                isEscaped(selectorIndex))) {
                            selectorIndex += 1;
                        }
                        value = unescapeCSS(selector.slice(valueStart, selectorIndex));
                    }
                    stripWhitespace(0);
                    // See if we have a force ignore flag
                    const forceIgnore = selector.charCodeAt(selectorIndex) | 0x20;
                    // If the forceIgnore flag is set (either `i` or `s`), use that value
                    if (forceIgnore === 115 /* LowerS */) {
                        ignoreCase = false;
                        stripWhitespace(1);
                    }
                    else if (forceIgnore === 105 /* LowerI */) {
                        ignoreCase = true;
                        stripWhitespace(1);
                    }
                }
                if (selector.charCodeAt(selectorIndex) !==
                    93 /* RightSquareBracket */) {
                    throw new Error("Attribute selector didn't terminate");
                }
                selectorIndex += 1;
                const attributeSelector = {
                    type: SelectorType.Attribute,
                    name,
                    action,
                    value,
                    namespace,
                    ignoreCase,
                };
                tokens.push(attributeSelector);
                break;
            }
            case 58 /* Colon */: {
                if (selector.charCodeAt(selectorIndex + 1) === 58 /* Colon */) {
                    tokens.push({
                        type: SelectorType.PseudoElement,
                        name: getName(2).toLowerCase(),
                        data: selector.charCodeAt(selectorIndex) ===
                            40 /* LeftParenthesis */
                            ? readValueWithParenthesis()
                            : null,
                    });
                    continue;
                }
                const name = getName(1).toLowerCase();
                let data = null;
                if (selector.charCodeAt(selectorIndex) ===
                    40 /* LeftParenthesis */) {
                    if (unpackPseudos.has(name)) {
                        if (isQuote(selector.charCodeAt(selectorIndex + 1))) {
                            throw new Error(`Pseudo-selector ${name} cannot be quoted`);
                        }
                        data = [];
                        selectorIndex = parseSelector(data, selector, selectorIndex + 1);
                        if (selector.charCodeAt(selectorIndex) !==
                            41 /* RightParenthesis */) {
                            throw new Error(`Missing closing parenthesis in :${name} (${selector})`);
                        }
                        selectorIndex += 1;
                    }
                    else {
                        data = readValueWithParenthesis();
                        if (stripQuotesFromPseudos.has(name)) {
                            const quot = data.charCodeAt(0);
                            if (quot === data.charCodeAt(data.length - 1) &&
                                isQuote(quot)) {
                                data = data.slice(1, -1);
                            }
                        }
                        data = unescapeCSS(data);
                    }
                }
                tokens.push({ type: SelectorType.Pseudo, name, data });
                break;
            }
            case 44 /* Comma */: {
                finalizeSubselector();
                tokens = [];
                stripWhitespace(1);
                break;
            }
            default: {
                if (selector.startsWith("/*", selectorIndex)) {
                    const endIndex = selector.indexOf("*/", selectorIndex + 2);
                    if (endIndex < 0) {
                        throw new Error("Comment was not terminated");
                    }
                    selectorIndex = endIndex + 2;
                    // Remove leading whitespace
                    if (tokens.length === 0) {
                        stripWhitespace(0);
                    }
                    break;
                }
                let namespace = null;
                let name;
                if (firstChar === 42 /* Asterisk */) {
                    selectorIndex += 1;
                    name = "*";
                }
                else if (firstChar === 124 /* Pipe */) {
                    name = "";
                    if (selector.charCodeAt(selectorIndex + 1) === 124 /* Pipe */) {
                        addTraversal(SelectorType.ColumnCombinator);
                        stripWhitespace(2);
                        break;
                    }
                }
                else if (reName.test(selector.slice(selectorIndex))) {
                    name = getName(0);
                }
                else {
                    break loop;
                }
                if (selector.charCodeAt(selectorIndex) === 124 /* Pipe */ &&
                    selector.charCodeAt(selectorIndex + 1) !== 124 /* Pipe */) {
                    namespace = name;
                    if (selector.charCodeAt(selectorIndex + 1) ===
                        42 /* Asterisk */) {
                        name = "*";
                        selectorIndex += 2;
                    }
                    else {
                        name = getName(1);
                    }
                }
                tokens.push(name === "*"
                    ? { type: SelectorType.Universal, namespace }
                    : { type: SelectorType.Tag, name, namespace });
            }
        }
    }
    finalizeSubselector();
    return selectorIndex;
}

const attribValChars = ["\\", '"'];
const pseudoValChars = [...attribValChars, "(", ")"];
new Set(attribValChars.map((c) => c.charCodeAt(0)));
new Set(pseudoValChars.map((c) => c.charCodeAt(0)));
new Set([
    ...pseudoValChars,
    "~",
    "^",
    "$",
    "*",
    "+",
    "!",
    "|",
    ":",
    "[",
    "]",
    " ",
    ".",
].map((c) => c.charCodeAt(0)));

var boolbase = {
	trueFunc: function trueFunc(){
		return true;
	},
	falseFunc: function falseFunc(){
		return false;
	}
};

const procedure = new Map([
    [SelectorType.Universal, 50],
    [SelectorType.Tag, 30],
    [SelectorType.Attribute, 1],
    [SelectorType.Pseudo, 0],
]);
function isTraversal(token) {
    return !procedure.has(token.type);
}
const attributes = new Map([
    [AttributeAction.Exists, 10],
    [AttributeAction.Equals, 8],
    [AttributeAction.Not, 7],
    [AttributeAction.Start, 6],
    [AttributeAction.End, 6],
    [AttributeAction.Any, 5],
]);
/**
 * Sort the parts of the passed selector,
 * as there is potential for optimization
 * (some types of selectors are faster than others)
 *
 * @param arr Selector to sort
 */
function sortByProcedure(arr) {
    const procs = arr.map(getProcedure);
    for (let i = 1; i < arr.length; i++) {
        const procNew = procs[i];
        if (procNew < 0)
            continue;
        for (let j = i - 1; j >= 0 && procNew < procs[j]; j--) {
            const token = arr[j + 1];
            arr[j + 1] = arr[j];
            arr[j] = token;
            procs[j + 1] = procs[j];
            procs[j] = procNew;
        }
    }
}
function getProcedure(token) {
    var _a, _b;
    let proc = (_a = procedure.get(token.type)) !== null && _a !== void 0 ? _a : -1;
    if (token.type === SelectorType.Attribute) {
        proc = (_b = attributes.get(token.action)) !== null && _b !== void 0 ? _b : 4;
        if (token.action === AttributeAction.Equals && token.name === "id") {
            // Prefer ID selectors (eg. #ID)
            proc = 9;
        }
        if (token.ignoreCase) {
            /*
             * IgnoreCase adds some overhead, prefer "normal" token
             * this is a binary operation, to ensure it's still an int
             */
            proc >>= 1;
        }
    }
    else if (token.type === SelectorType.Pseudo) {
        if (!token.data) {
            proc = 3;
        }
        else if (token.name === "has" || token.name === "contains") {
            proc = 0; // Expensive in any case
        }
        else if (Array.isArray(token.data)) {
            // Eg. :matches, :not
            proc = Math.min(...token.data.map((d) => Math.min(...d.map(getProcedure))));
            // If we have traversals, try to avoid executing this selector
            if (proc < 0) {
                proc = 0;
            }
        }
        else {
            proc = 2;
        }
    }
    return proc;
}

/**
 * All reserved characters in a regex, used for escaping.
 *
 * Taken from XRegExp, (c) 2007-2020 Steven Levithan under the MIT license
 * https://github.com/slevithan/xregexp/blob/95eeebeb8fac8754d54eafe2b4743661ac1cf028/src/xregexp.js#L794
 */
const reChars = /[-[\]{}()*+?.,\\^$|#\s]/g;
function escapeRegex(value) {
    return value.replace(reChars, "\\$&");
}
/**
 * Attributes that are case-insensitive in HTML.
 *
 * @private
 * @see https://html.spec.whatwg.org/multipage/semantics-other.html#case-sensitivity-of-selectors
 */
const caseInsensitiveAttributes = new Set([
    "accept",
    "accept-charset",
    "align",
    "alink",
    "axis",
    "bgcolor",
    "charset",
    "checked",
    "clear",
    "codetype",
    "color",
    "compact",
    "declare",
    "defer",
    "dir",
    "direction",
    "disabled",
    "enctype",
    "face",
    "frame",
    "hreflang",
    "http-equiv",
    "lang",
    "language",
    "link",
    "media",
    "method",
    "multiple",
    "nohref",
    "noresize",
    "noshade",
    "nowrap",
    "readonly",
    "rel",
    "rev",
    "rules",
    "scope",
    "scrolling",
    "selected",
    "shape",
    "target",
    "text",
    "type",
    "valign",
    "valuetype",
    "vlink",
]);
function shouldIgnoreCase(selector, options) {
    return typeof selector.ignoreCase === "boolean"
        ? selector.ignoreCase
        : selector.ignoreCase === "quirks"
            ? !!options.quirksMode
            : !options.xmlMode && caseInsensitiveAttributes.has(selector.name);
}
/**
 * Attribute selectors
 */
const attributeRules = {
    equals(next, data, options) {
        const { adapter } = options;
        const { name } = data;
        let { value } = data;
        if (shouldIgnoreCase(data, options)) {
            value = value.toLowerCase();
            return (elem) => {
                const attr = adapter.getAttributeValue(elem, name);
                return (attr != null &&
                    attr.length === value.length &&
                    attr.toLowerCase() === value &&
                    next(elem));
            };
        }
        return (elem) => adapter.getAttributeValue(elem, name) === value && next(elem);
    },
    hyphen(next, data, options) {
        const { adapter } = options;
        const { name } = data;
        let { value } = data;
        const len = value.length;
        if (shouldIgnoreCase(data, options)) {
            value = value.toLowerCase();
            return function hyphenIC(elem) {
                const attr = adapter.getAttributeValue(elem, name);
                return (attr != null &&
                    (attr.length === len || attr.charAt(len) === "-") &&
                    attr.substr(0, len).toLowerCase() === value &&
                    next(elem));
            };
        }
        return function hyphen(elem) {
            const attr = adapter.getAttributeValue(elem, name);
            return (attr != null &&
                (attr.length === len || attr.charAt(len) === "-") &&
                attr.substr(0, len) === value &&
                next(elem));
        };
    },
    element(next, data, options) {
        const { adapter } = options;
        const { name, value } = data;
        if (/\s/.test(value)) {
            return boolbase.falseFunc;
        }
        const regex = new RegExp(`(?:^|\\s)${escapeRegex(value)}(?:$|\\s)`, shouldIgnoreCase(data, options) ? "i" : "");
        return function element(elem) {
            const attr = adapter.getAttributeValue(elem, name);
            return (attr != null &&
                attr.length >= value.length &&
                regex.test(attr) &&
                next(elem));
        };
    },
    exists(next, { name }, { adapter }) {
        return (elem) => adapter.hasAttrib(elem, name) && next(elem);
    },
    start(next, data, options) {
        const { adapter } = options;
        const { name } = data;
        let { value } = data;
        const len = value.length;
        if (len === 0) {
            return boolbase.falseFunc;
        }
        if (shouldIgnoreCase(data, options)) {
            value = value.toLowerCase();
            return (elem) => {
                const attr = adapter.getAttributeValue(elem, name);
                return (attr != null &&
                    attr.length >= len &&
                    attr.substr(0, len).toLowerCase() === value &&
                    next(elem));
            };
        }
        return (elem) => {
            var _a;
            return !!((_a = adapter.getAttributeValue(elem, name)) === null || _a === void 0 ? void 0 : _a.startsWith(value)) &&
                next(elem);
        };
    },
    end(next, data, options) {
        const { adapter } = options;
        const { name } = data;
        let { value } = data;
        const len = -value.length;
        if (len === 0) {
            return boolbase.falseFunc;
        }
        if (shouldIgnoreCase(data, options)) {
            value = value.toLowerCase();
            return (elem) => {
                var _a;
                return ((_a = adapter
                    .getAttributeValue(elem, name)) === null || _a === void 0 ? void 0 : _a.substr(len).toLowerCase()) === value && next(elem);
            };
        }
        return (elem) => {
            var _a;
            return !!((_a = adapter.getAttributeValue(elem, name)) === null || _a === void 0 ? void 0 : _a.endsWith(value)) &&
                next(elem);
        };
    },
    any(next, data, options) {
        const { adapter } = options;
        const { name, value } = data;
        if (value === "") {
            return boolbase.falseFunc;
        }
        if (shouldIgnoreCase(data, options)) {
            const regex = new RegExp(escapeRegex(value), "i");
            return function anyIC(elem) {
                const attr = adapter.getAttributeValue(elem, name);
                return (attr != null &&
                    attr.length >= value.length &&
                    regex.test(attr) &&
                    next(elem));
            };
        }
        return (elem) => {
            var _a;
            return !!((_a = adapter.getAttributeValue(elem, name)) === null || _a === void 0 ? void 0 : _a.includes(value)) &&
                next(elem);
        };
    },
    not(next, data, options) {
        const { adapter } = options;
        const { name } = data;
        let { value } = data;
        if (value === "") {
            return (elem) => !!adapter.getAttributeValue(elem, name) && next(elem);
        }
        else if (shouldIgnoreCase(data, options)) {
            value = value.toLowerCase();
            return (elem) => {
                const attr = adapter.getAttributeValue(elem, name);
                return ((attr == null ||
                    attr.length !== value.length ||
                    attr.toLowerCase() !== value) &&
                    next(elem));
            };
        }
        return (elem) => adapter.getAttributeValue(elem, name) !== value && next(elem);
    },
};

// Following http://www.w3.org/TR/css3-selectors/#nth-child-pseudo
// Whitespace as per https://www.w3.org/TR/selectors-3/#lex is " \t\r\n\f"
const whitespace = new Set([9, 10, 12, 13, 32]);
const ZERO = "0".charCodeAt(0);
const NINE = "9".charCodeAt(0);
/**
 * Parses an expression.
 *
 * @throws An `Error` if parsing fails.
 * @returns An array containing the integer step size and the integer offset of the nth rule.
 * @example nthCheck.parse("2n+3"); // returns [2, 3]
 */
function parse$3(formula) {
    formula = formula.trim().toLowerCase();
    if (formula === "even") {
        return [2, 0];
    }
    else if (formula === "odd") {
        return [2, 1];
    }
    // Parse [ ['-'|'+']? INTEGER? {N} [ S* ['-'|'+'] S* INTEGER ]?
    let idx = 0;
    let a = 0;
    let sign = readSign();
    let number = readNumber();
    if (idx < formula.length && formula.charAt(idx) === "n") {
        idx++;
        a = sign * (number !== null && number !== void 0 ? number : 1);
        skipWhitespace();
        if (idx < formula.length) {
            sign = readSign();
            skipWhitespace();
            number = readNumber();
        }
        else {
            sign = number = 0;
        }
    }
    // Throw if there is anything else
    if (number === null || idx < formula.length) {
        throw new Error(`n-th rule couldn't be parsed ('${formula}')`);
    }
    return [a, sign * number];
    function readSign() {
        if (formula.charAt(idx) === "-") {
            idx++;
            return -1;
        }
        if (formula.charAt(idx) === "+") {
            idx++;
        }
        return 1;
    }
    function readNumber() {
        const start = idx;
        let value = 0;
        while (idx < formula.length &&
            formula.charCodeAt(idx) >= ZERO &&
            formula.charCodeAt(idx) <= NINE) {
            value = value * 10 + (formula.charCodeAt(idx) - ZERO);
            idx++;
        }
        // Return `null` if we didn't read anything.
        return idx === start ? null : value;
    }
    function skipWhitespace() {
        while (idx < formula.length &&
            whitespace.has(formula.charCodeAt(idx))) {
            idx++;
        }
    }
}

/**
 * Returns a function that checks if an elements index matches the given rule
 * highly optimized to return the fastest solution.
 *
 * @param parsed A tuple [a, b], as returned by `parse`.
 * @returns A highly optimized function that returns whether an index matches the nth-check.
 * @example
 *
 * ```js
 * const check = nthCheck.compile([2, 3]);
 *
 * check(0); // `false`
 * check(1); // `false`
 * check(2); // `true`
 * check(3); // `false`
 * check(4); // `true`
 * check(5); // `false`
 * check(6); // `true`
 * ```
 */
function compile(parsed) {
    const a = parsed[0];
    // Subtract 1 from `b`, to convert from one- to zero-indexed.
    const b = parsed[1] - 1;
    /*
     * When `b <= 0`, `a * n` won't be lead to any matches for `a < 0`.
     * Besides, the specification states that no elements are
     * matched when `a` and `b` are 0.
     *
     * `b < 0` here as we subtracted 1 from `b` above.
     */
    if (b < 0 && a <= 0)
        return boolbase.falseFunc;
    // When `a` is in the range -1..1, it matches any element (so only `b` is checked).
    if (a === -1)
        return (index) => index <= b;
    if (a === 0)
        return (index) => index === b;
    // When `b <= 0` and `a === 1`, they match any element.
    if (a === 1)
        return b < 0 ? boolbase.trueFunc : (index) => index >= b;
    /*
     * Otherwise, modulo can be used to check if there is a match.
     *
     * Modulo doesn't care about the sign, so let's use `a`s absolute value.
     */
    const absA = Math.abs(a);
    // Get `b mod a`, + a if this is negative.
    const bMod = ((b % absA) + absA) % absA;
    return a > 1
        ? (index) => index >= b && index % absA === bMod
        : (index) => index <= b && index % absA === bMod;
}

/**
 * Parses and compiles a formula to a highly optimized function.
 * Combination of {@link parse} and {@link compile}.
 *
 * If the formula doesn't match any elements,
 * it returns [`boolbase`](https://github.com/fb55/boolbase)'s `falseFunc`.
 * Otherwise, a function accepting an _index_ is returned, which returns
 * whether or not the passed _index_ matches the formula.
 *
 * Note: The nth-rule starts counting at `1`, the returned function at `0`.
 *
 * @param formula The formula to compile.
 * @example
 * const check = nthCheck("2n+3");
 *
 * check(0); // `false`
 * check(1); // `false`
 * check(2); // `true`
 * check(3); // `false`
 * check(4); // `true`
 * check(5); // `false`
 * check(6); // `true`
 */
function nthCheck(formula) {
    return compile(parse$3(formula));
}

function getChildFunc(next, adapter) {
    return (elem) => {
        const parent = adapter.getParent(elem);
        return parent != null && adapter.isTag(parent) && next(elem);
    };
}
const filters = {
    contains(next, text, { adapter }) {
        return function contains(elem) {
            return next(elem) && adapter.getText(elem).includes(text);
        };
    },
    icontains(next, text, { adapter }) {
        const itext = text.toLowerCase();
        return function icontains(elem) {
            return (next(elem) &&
                adapter.getText(elem).toLowerCase().includes(itext));
        };
    },
    // Location specific methods
    "nth-child"(next, rule, { adapter, equals }) {
        const func = nthCheck(rule);
        if (func === boolbase.falseFunc)
            return boolbase.falseFunc;
        if (func === boolbase.trueFunc)
            return getChildFunc(next, adapter);
        return function nthChild(elem) {
            const siblings = adapter.getSiblings(elem);
            let pos = 0;
            for (let i = 0; i < siblings.length; i++) {
                if (equals(elem, siblings[i]))
                    break;
                if (adapter.isTag(siblings[i])) {
                    pos++;
                }
            }
            return func(pos) && next(elem);
        };
    },
    "nth-last-child"(next, rule, { adapter, equals }) {
        const func = nthCheck(rule);
        if (func === boolbase.falseFunc)
            return boolbase.falseFunc;
        if (func === boolbase.trueFunc)
            return getChildFunc(next, adapter);
        return function nthLastChild(elem) {
            const siblings = adapter.getSiblings(elem);
            let pos = 0;
            for (let i = siblings.length - 1; i >= 0; i--) {
                if (equals(elem, siblings[i]))
                    break;
                if (adapter.isTag(siblings[i])) {
                    pos++;
                }
            }
            return func(pos) && next(elem);
        };
    },
    "nth-of-type"(next, rule, { adapter, equals }) {
        const func = nthCheck(rule);
        if (func === boolbase.falseFunc)
            return boolbase.falseFunc;
        if (func === boolbase.trueFunc)
            return getChildFunc(next, adapter);
        return function nthOfType(elem) {
            const siblings = adapter.getSiblings(elem);
            let pos = 0;
            for (let i = 0; i < siblings.length; i++) {
                const currentSibling = siblings[i];
                if (equals(elem, currentSibling))
                    break;
                if (adapter.isTag(currentSibling) &&
                    adapter.getName(currentSibling) === adapter.getName(elem)) {
                    pos++;
                }
            }
            return func(pos) && next(elem);
        };
    },
    "nth-last-of-type"(next, rule, { adapter, equals }) {
        const func = nthCheck(rule);
        if (func === boolbase.falseFunc)
            return boolbase.falseFunc;
        if (func === boolbase.trueFunc)
            return getChildFunc(next, adapter);
        return function nthLastOfType(elem) {
            const siblings = adapter.getSiblings(elem);
            let pos = 0;
            for (let i = siblings.length - 1; i >= 0; i--) {
                const currentSibling = siblings[i];
                if (equals(elem, currentSibling))
                    break;
                if (adapter.isTag(currentSibling) &&
                    adapter.getName(currentSibling) === adapter.getName(elem)) {
                    pos++;
                }
            }
            return func(pos) && next(elem);
        };
    },
    // TODO determine the actual root element
    root(next, _rule, { adapter }) {
        return (elem) => {
            const parent = adapter.getParent(elem);
            return (parent == null || !adapter.isTag(parent)) && next(elem);
        };
    },
    scope(next, rule, options, context) {
        const { equals } = options;
        if (!context || context.length === 0) {
            // Equivalent to :root
            return filters["root"](next, rule, options);
        }
        if (context.length === 1) {
            // NOTE: can't be unpacked, as :has uses this for side-effects
            return (elem) => equals(context[0], elem) && next(elem);
        }
        return (elem) => context.includes(elem) && next(elem);
    },
    hover: dynamicStatePseudo("isHovered"),
    visited: dynamicStatePseudo("isVisited"),
    active: dynamicStatePseudo("isActive"),
};
/**
 * Dynamic state pseudos. These depend on optional Adapter methods.
 *
 * @param name The name of the adapter method to call.
 * @returns Pseudo for the `filters` object.
 */
function dynamicStatePseudo(name) {
    return function dynamicPseudo(next, _rule, { adapter }) {
        const func = adapter[name];
        if (typeof func !== "function") {
            return boolbase.falseFunc;
        }
        return function active(elem) {
            return func(elem) && next(elem);
        };
    };
}

// While filters are precompiled, pseudos get called when they are needed
const pseudos = {
    empty(elem, { adapter }) {
        return !adapter.getChildren(elem).some((elem) => 
        // FIXME: `getText` call is potentially expensive.
        adapter.isTag(elem) || adapter.getText(elem) !== "");
    },
    "first-child"(elem, { adapter, equals }) {
        if (adapter.prevElementSibling) {
            return adapter.prevElementSibling(elem) == null;
        }
        const firstChild = adapter
            .getSiblings(elem)
            .find((elem) => adapter.isTag(elem));
        return firstChild != null && equals(elem, firstChild);
    },
    "last-child"(elem, { adapter, equals }) {
        const siblings = adapter.getSiblings(elem);
        for (let i = siblings.length - 1; i >= 0; i--) {
            if (equals(elem, siblings[i]))
                return true;
            if (adapter.isTag(siblings[i]))
                break;
        }
        return false;
    },
    "first-of-type"(elem, { adapter, equals }) {
        const siblings = adapter.getSiblings(elem);
        const elemName = adapter.getName(elem);
        for (let i = 0; i < siblings.length; i++) {
            const currentSibling = siblings[i];
            if (equals(elem, currentSibling))
                return true;
            if (adapter.isTag(currentSibling) &&
                adapter.getName(currentSibling) === elemName) {
                break;
            }
        }
        return false;
    },
    "last-of-type"(elem, { adapter, equals }) {
        const siblings = adapter.getSiblings(elem);
        const elemName = adapter.getName(elem);
        for (let i = siblings.length - 1; i >= 0; i--) {
            const currentSibling = siblings[i];
            if (equals(elem, currentSibling))
                return true;
            if (adapter.isTag(currentSibling) &&
                adapter.getName(currentSibling) === elemName) {
                break;
            }
        }
        return false;
    },
    "only-of-type"(elem, { adapter, equals }) {
        const elemName = adapter.getName(elem);
        return adapter
            .getSiblings(elem)
            .every((sibling) => equals(elem, sibling) ||
            !adapter.isTag(sibling) ||
            adapter.getName(sibling) !== elemName);
    },
    "only-child"(elem, { adapter, equals }) {
        return adapter
            .getSiblings(elem)
            .every((sibling) => equals(elem, sibling) || !adapter.isTag(sibling));
    },
};
function verifyPseudoArgs(func, name, subselect, argIndex) {
    if (subselect === null) {
        if (func.length > argIndex) {
            throw new Error(`Pseudo-class :${name} requires an argument`);
        }
    }
    else if (func.length === argIndex) {
        throw new Error(`Pseudo-class :${name} doesn't have any arguments`);
    }
}

/**
 * Aliases are pseudos that are expressed as selectors.
 */
const aliases = {
    // Links
    "any-link": ":is(a, area, link)[href]",
    link: ":any-link:not(:visited)",
    // Forms
    // https://html.spec.whatwg.org/multipage/scripting.html#disabled-elements
    disabled: `:is(
        :is(button, input, select, textarea, optgroup, option)[disabled],
        optgroup[disabled] > option,
        fieldset[disabled]:not(fieldset[disabled] legend:first-of-type *)
    )`,
    enabled: ":not(:disabled)",
    checked: ":is(:is(input[type=radio], input[type=checkbox])[checked], option:selected)",
    required: ":is(input, select, textarea)[required]",
    optional: ":is(input, select, textarea):not([required])",
    // JQuery extensions
    // https://html.spec.whatwg.org/multipage/form-elements.html#concept-option-selectedness
    selected: "option:is([selected], select:not([multiple]):not(:has(> option[selected])) > :first-of-type)",
    checkbox: "[type=checkbox]",
    file: "[type=file]",
    password: "[type=password]",
    radio: "[type=radio]",
    reset: "[type=reset]",
    image: "[type=image]",
    submit: "[type=submit]",
    parent: ":not(:empty)",
    header: ":is(h1, h2, h3, h4, h5, h6)",
    button: ":is(button, input[type=button])",
    input: ":is(input, textarea, select, button)",
    text: "input:is(:not([type!='']), [type=text])",
};

/** Used as a placeholder for :has. Will be replaced with the actual element. */
const PLACEHOLDER_ELEMENT = {};
function ensureIsTag(next, adapter) {
    if (next === boolbase.falseFunc)
        return boolbase.falseFunc;
    return (elem) => adapter.isTag(elem) && next(elem);
}
function getNextSiblings(elem, adapter) {
    const siblings = adapter.getSiblings(elem);
    if (siblings.length <= 1)
        return [];
    const elemIndex = siblings.indexOf(elem);
    if (elemIndex < 0 || elemIndex === siblings.length - 1)
        return [];
    return siblings.slice(elemIndex + 1).filter(adapter.isTag);
}
function copyOptions(options) {
    // Not copied: context, rootFunc
    return {
        xmlMode: !!options.xmlMode,
        lowerCaseAttributeNames: !!options.lowerCaseAttributeNames,
        lowerCaseTags: !!options.lowerCaseTags,
        quirksMode: !!options.quirksMode,
        cacheResults: !!options.cacheResults,
        pseudos: options.pseudos,
        adapter: options.adapter,
        equals: options.equals,
    };
}
const is$2 = (next, token, options, context, compileToken) => {
    const func = compileToken(token, copyOptions(options), context);
    return func === boolbase.trueFunc
        ? next
        : func === boolbase.falseFunc
            ? boolbase.falseFunc
            : (elem) => func(elem) && next(elem);
};
/*
 * :not, :has, :is, :matches and :where have to compile selectors
 * doing this in src/pseudos.ts would lead to circular dependencies,
 * so we add them here
 */
const subselects = {
    is: is$2,
    /**
     * `:matches` and `:where` are aliases for `:is`.
     */
    matches: is$2,
    where: is$2,
    not(next, token, options, context, compileToken) {
        const func = compileToken(token, copyOptions(options), context);
        return func === boolbase.falseFunc
            ? next
            : func === boolbase.trueFunc
                ? boolbase.falseFunc
                : (elem) => !func(elem) && next(elem);
    },
    has(next, subselect, options, _context, compileToken) {
        const { adapter } = options;
        const opts = copyOptions(options);
        opts.relativeSelector = true;
        const context = subselect.some((s) => s.some(isTraversal))
            ? // Used as a placeholder. Will be replaced with the actual element.
                [PLACEHOLDER_ELEMENT]
            : undefined;
        const compiled = compileToken(subselect, opts, context);
        if (compiled === boolbase.falseFunc)
            return boolbase.falseFunc;
        const hasElement = ensureIsTag(compiled, adapter);
        // If `compiled` is `trueFunc`, we can skip this.
        if (context && compiled !== boolbase.trueFunc) {
            /*
             * `shouldTestNextSiblings` will only be true if the query starts with
             * a traversal (sibling or adjacent). That means we will always have a context.
             */
            const { shouldTestNextSiblings = false } = compiled;
            return (elem) => {
                if (!next(elem))
                    return false;
                context[0] = elem;
                const childs = adapter.getChildren(elem);
                const nextElements = shouldTestNextSiblings
                    ? [...childs, ...getNextSiblings(elem, adapter)]
                    : childs;
                return adapter.existsOne(hasElement, nextElements);
            };
        }
        return (elem) => next(elem) &&
            adapter.existsOne(hasElement, adapter.getChildren(elem));
    },
};

function compilePseudoSelector(next, selector, options, context, compileToken) {
    var _a;
    const { name, data } = selector;
    if (Array.isArray(data)) {
        if (!(name in subselects)) {
            throw new Error(`Unknown pseudo-class :${name}(${data})`);
        }
        return subselects[name](next, data, options, context, compileToken);
    }
    const userPseudo = (_a = options.pseudos) === null || _a === void 0 ? void 0 : _a[name];
    const stringPseudo = typeof userPseudo === "string" ? userPseudo : aliases[name];
    if (typeof stringPseudo === "string") {
        if (data != null) {
            throw new Error(`Pseudo ${name} doesn't have any arguments`);
        }
        // The alias has to be parsed here, to make sure options are respected.
        const alias = parse$4(stringPseudo);
        return subselects["is"](next, alias, options, context, compileToken);
    }
    if (typeof userPseudo === "function") {
        verifyPseudoArgs(userPseudo, name, data, 1);
        return (elem) => userPseudo(elem, data) && next(elem);
    }
    if (name in filters) {
        return filters[name](next, data, options, context);
    }
    if (name in pseudos) {
        const pseudo = pseudos[name];
        verifyPseudoArgs(pseudo, name, data, 2);
        return (elem) => pseudo(elem, options, data) && next(elem);
    }
    throw new Error(`Unknown pseudo-class :${name}`);
}

function getElementParent(node, adapter) {
    const parent = adapter.getParent(node);
    if (parent && adapter.isTag(parent)) {
        return parent;
    }
    return null;
}
/*
 * All available rules
 */
function compileGeneralSelector(next, selector, options, context, compileToken) {
    const { adapter, equals } = options;
    switch (selector.type) {
        case SelectorType.PseudoElement: {
            throw new Error("Pseudo-elements are not supported by css-select");
        }
        case SelectorType.ColumnCombinator: {
            throw new Error("Column combinators are not yet supported by css-select");
        }
        case SelectorType.Attribute: {
            if (selector.namespace != null) {
                throw new Error("Namespaced attributes are not yet supported by css-select");
            }
            if (!options.xmlMode || options.lowerCaseAttributeNames) {
                selector.name = selector.name.toLowerCase();
            }
            return attributeRules[selector.action](next, selector, options);
        }
        case SelectorType.Pseudo: {
            return compilePseudoSelector(next, selector, options, context, compileToken);
        }
        // Tags
        case SelectorType.Tag: {
            if (selector.namespace != null) {
                throw new Error("Namespaced tag names are not yet supported by css-select");
            }
            let { name } = selector;
            if (!options.xmlMode || options.lowerCaseTags) {
                name = name.toLowerCase();
            }
            return function tag(elem) {
                return adapter.getName(elem) === name && next(elem);
            };
        }
        // Traversal
        case SelectorType.Descendant: {
            if (options.cacheResults === false ||
                typeof WeakSet === "undefined") {
                return function descendant(elem) {
                    let current = elem;
                    while ((current = getElementParent(current, adapter))) {
                        if (next(current)) {
                            return true;
                        }
                    }
                    return false;
                };
            }
            // @ts-expect-error `ElementNode` is not extending object
            const isFalseCache = new WeakSet();
            return function cachedDescendant(elem) {
                let current = elem;
                while ((current = getElementParent(current, adapter))) {
                    if (!isFalseCache.has(current)) {
                        if (adapter.isTag(current) && next(current)) {
                            return true;
                        }
                        isFalseCache.add(current);
                    }
                }
                return false;
            };
        }
        case "_flexibleDescendant": {
            // Include element itself, only used while querying an array
            return function flexibleDescendant(elem) {
                let current = elem;
                do {
                    if (next(current))
                        return true;
                } while ((current = getElementParent(current, adapter)));
                return false;
            };
        }
        case SelectorType.Parent: {
            return function parent(elem) {
                return adapter
                    .getChildren(elem)
                    .some((elem) => adapter.isTag(elem) && next(elem));
            };
        }
        case SelectorType.Child: {
            return function child(elem) {
                const parent = adapter.getParent(elem);
                return parent != null && adapter.isTag(parent) && next(parent);
            };
        }
        case SelectorType.Sibling: {
            return function sibling(elem) {
                const siblings = adapter.getSiblings(elem);
                for (let i = 0; i < siblings.length; i++) {
                    const currentSibling = siblings[i];
                    if (equals(elem, currentSibling))
                        break;
                    if (adapter.isTag(currentSibling) && next(currentSibling)) {
                        return true;
                    }
                }
                return false;
            };
        }
        case SelectorType.Adjacent: {
            if (adapter.prevElementSibling) {
                return function adjacent(elem) {
                    const previous = adapter.prevElementSibling(elem);
                    return previous != null && next(previous);
                };
            }
            return function adjacent(elem) {
                const siblings = adapter.getSiblings(elem);
                let lastElement;
                for (let i = 0; i < siblings.length; i++) {
                    const currentSibling = siblings[i];
                    if (equals(elem, currentSibling))
                        break;
                    if (adapter.isTag(currentSibling)) {
                        lastElement = currentSibling;
                    }
                }
                return !!lastElement && next(lastElement);
            };
        }
        case SelectorType.Universal: {
            if (selector.namespace != null && selector.namespace !== "*") {
                throw new Error("Namespaced universal selectors are not yet supported by css-select");
            }
            return next;
        }
    }
}

function includesScopePseudo(t) {
    return (t.type === SelectorType.Pseudo &&
        (t.name === "scope" ||
            (Array.isArray(t.data) &&
                t.data.some((data) => data.some(includesScopePseudo)))));
}
const DESCENDANT_TOKEN = { type: SelectorType.Descendant };
const FLEXIBLE_DESCENDANT_TOKEN = {
    type: "_flexibleDescendant",
};
const SCOPE_TOKEN = {
    type: SelectorType.Pseudo,
    name: "scope",
    data: null,
};
/*
 * CSS 4 Spec (Draft): 3.4.1. Absolutizing a Relative Selector
 * http://www.w3.org/TR/selectors4/#absolutizing
 */
function absolutize(token, { adapter }, context) {
    // TODO Use better check if the context is a document
    const hasContext = !!(context === null || context === void 0 ? void 0 : context.every((e) => {
        const parent = adapter.isTag(e) && adapter.getParent(e);
        return e === PLACEHOLDER_ELEMENT || (parent && adapter.isTag(parent));
    }));
    for (const t of token) {
        if (t.length > 0 &&
            isTraversal(t[0]) &&
            t[0].type !== SelectorType.Descendant) ;
        else if (hasContext && !t.some(includesScopePseudo)) {
            t.unshift(DESCENDANT_TOKEN);
        }
        else {
            continue;
        }
        t.unshift(SCOPE_TOKEN);
    }
}
function compileToken(token, options, context) {
    var _a;
    token.forEach(sortByProcedure);
    context = (_a = options.context) !== null && _a !== void 0 ? _a : context;
    const isArrayContext = Array.isArray(context);
    const finalContext = context && (Array.isArray(context) ? context : [context]);
    // Check if the selector is relative
    if (options.relativeSelector !== false) {
        absolutize(token, options, finalContext);
    }
    else if (token.some((t) => t.length > 0 && isTraversal(t[0]))) {
        throw new Error("Relative selectors are not allowed when the `relativeSelector` option is disabled");
    }
    let shouldTestNextSiblings = false;
    const query = token
        .map((rules) => {
        if (rules.length >= 2) {
            const [first, second] = rules;
            if (first.type !== SelectorType.Pseudo ||
                first.name !== "scope") ;
            else if (isArrayContext &&
                second.type === SelectorType.Descendant) {
                rules[1] = FLEXIBLE_DESCENDANT_TOKEN;
            }
            else if (second.type === SelectorType.Adjacent ||
                second.type === SelectorType.Sibling) {
                shouldTestNextSiblings = true;
            }
        }
        return compileRules(rules, options, finalContext);
    })
        .reduce(reduceRules, boolbase.falseFunc);
    query.shouldTestNextSiblings = shouldTestNextSiblings;
    return query;
}
function compileRules(rules, options, context) {
    var _a;
    return rules.reduce((previous, rule) => previous === boolbase.falseFunc
        ? boolbase.falseFunc
        : compileGeneralSelector(previous, rule, options, context, compileToken), (_a = options.rootFunc) !== null && _a !== void 0 ? _a : boolbase.trueFunc);
}
function reduceRules(a, b) {
    if (b === boolbase.falseFunc || a === boolbase.trueFunc) {
        return a;
    }
    if (a === boolbase.falseFunc || b === boolbase.trueFunc) {
        return b;
    }
    return function combine(elem) {
        return a(elem) || b(elem);
    };
}

const defaultEquals = (a, b) => a === b;
const defaultOptions = {
    adapter: DomUtils,
    equals: defaultEquals,
};
function convertOptionFormats(options) {
    var _a, _b, _c, _d;
    /*
     * We force one format of options to the other one.
     */
    // @ts-expect-error Default options may have incompatible `Node` / `ElementNode`.
    const opts = options !== null && options !== void 0 ? options : defaultOptions;
    // @ts-expect-error Same as above.
    (_a = opts.adapter) !== null && _a !== void 0 ? _a : (opts.adapter = DomUtils);
    // @ts-expect-error `equals` does not exist on `Options`
    (_b = opts.equals) !== null && _b !== void 0 ? _b : (opts.equals = (_d = (_c = opts.adapter) === null || _c === void 0 ? void 0 : _c.equals) !== null && _d !== void 0 ? _d : defaultEquals);
    return opts;
}
function wrapCompile(func) {
    return function addAdapter(selector, options, context) {
        const opts = convertOptionFormats(options);
        return func(selector, opts, context);
    };
}
const _compileToken = wrapCompile(compileToken);
function prepareContext(elems, adapter, shouldTestNextSiblings = false) {
    /*
     * Add siblings if the query requires them.
     * See https://github.com/fb55/css-select/pull/43#issuecomment-225414692
     */
    if (shouldTestNextSiblings) {
        elems = appendNextSiblings(elems, adapter);
    }
    return Array.isArray(elems)
        ? adapter.removeSubsets(elems)
        : adapter.getChildren(elems);
}
function appendNextSiblings(elem, adapter) {
    // Order matters because jQuery seems to check the children before the siblings
    const elems = Array.isArray(elem) ? elem.slice(0) : [elem];
    const elemsLength = elems.length;
    for (let i = 0; i < elemsLength; i++) {
        const nextSiblings = getNextSiblings(elems[i], adapter);
        elems.push(...nextSiblings);
    }
    return elems;
}

const filterNames = new Set([
    "first",
    "last",
    "eq",
    "gt",
    "nth",
    "lt",
    "even",
    "odd",
]);
function isFilter(s) {
    if (s.type !== "pseudo")
        return false;
    if (filterNames.has(s.name))
        return true;
    if (s.name === "not" && Array.isArray(s.data)) {
        // Only consider `:not` with embedded filters
        return s.data.some((s) => s.some(isFilter));
    }
    return false;
}
function getLimit(filter, data, partLimit) {
    const num = data != null ? parseInt(data, 10) : NaN;
    switch (filter) {
        case "first":
            return 1;
        case "nth":
        case "eq":
            return isFinite(num) ? (num >= 0 ? num + 1 : Infinity) : 0;
        case "lt":
            return isFinite(num)
                ? num >= 0
                    ? Math.min(num, partLimit)
                    : Infinity
                : 0;
        case "gt":
            return isFinite(num) ? Infinity : 0;
        case "odd":
            return 2 * partLimit;
        case "even":
            return 2 * partLimit - 1;
        case "last":
        case "not":
            return Infinity;
    }
}

function getDocumentRoot(node) {
    while (node.parent)
        node = node.parent;
    return node;
}
function groupSelectors(selectors) {
    const filteredSelectors = [];
    const plainSelectors = [];
    for (const selector of selectors) {
        if (selector.some(isFilter)) {
            filteredSelectors.push(selector);
        }
        else {
            plainSelectors.push(selector);
        }
    }
    return [plainSelectors, filteredSelectors];
}

const UNIVERSAL_SELECTOR = {
    type: SelectorType.Universal,
    namespace: null,
};
const SCOPE_PSEUDO = {
    type: SelectorType.Pseudo,
    name: "scope",
    data: null,
};
function is$1(element, selector, options = {}) {
    return some([element], selector, options);
}
function some(elements, selector, options = {}) {
    if (typeof selector === "function")
        return elements.some(selector);
    const [plain, filtered] = groupSelectors(parse$4(selector));
    return ((plain.length > 0 && elements.some(_compileToken(plain, options))) ||
        filtered.some((sel) => filterBySelector(sel, elements, options).length > 0));
}
function filterByPosition(filter, elems, data, options) {
    const num = typeof data === "string" ? parseInt(data, 10) : NaN;
    switch (filter) {
        case "first":
        case "lt":
            // Already done in `getLimit`
            return elems;
        case "last":
            return elems.length > 0 ? [elems[elems.length - 1]] : elems;
        case "nth":
        case "eq":
            return isFinite(num) && Math.abs(num) < elems.length
                ? [num < 0 ? elems[elems.length + num] : elems[num]]
                : [];
        case "gt":
            return isFinite(num) ? elems.slice(num + 1) : [];
        case "even":
            return elems.filter((_, i) => i % 2 === 0);
        case "odd":
            return elems.filter((_, i) => i % 2 === 1);
        case "not": {
            const filtered = new Set(filterParsed(data, elems, options));
            return elems.filter((e) => !filtered.has(e));
        }
    }
}
function filter$1(selector, elements, options = {}) {
    return filterParsed(parse$4(selector), elements, options);
}
/**
 * Filter a set of elements by a selector.
 *
 * Will return elements in the original order.
 *
 * @param selector Selector to filter by.
 * @param elements Elements to filter.
 * @param options Options for selector.
 */
function filterParsed(selector, elements, options) {
    if (elements.length === 0)
        return [];
    const [plainSelectors, filteredSelectors] = groupSelectors(selector);
    let found;
    if (plainSelectors.length) {
        const filtered = filterElements(elements, plainSelectors, options);
        // If there are no filters, just return
        if (filteredSelectors.length === 0) {
            return filtered;
        }
        // Otherwise, we have to do some filtering
        if (filtered.length) {
            found = new Set(filtered);
        }
    }
    for (let i = 0; i < filteredSelectors.length && (found === null || found === void 0 ? void 0 : found.size) !== elements.length; i++) {
        const filteredSelector = filteredSelectors[i];
        const missing = found
            ? elements.filter((e) => isTag(e) && !found.has(e))
            : elements;
        if (missing.length === 0)
            break;
        const filtered = filterBySelector(filteredSelector, elements, options);
        if (filtered.length) {
            if (!found) {
                /*
                 * If we haven't found anything before the last selector,
                 * just return what we found now.
                 */
                if (i === filteredSelectors.length - 1) {
                    return filtered;
                }
                found = new Set(filtered);
            }
            else {
                filtered.forEach((el) => found.add(el));
            }
        }
    }
    return typeof found !== "undefined"
        ? (found.size === elements.length
            ? elements
            : // Filter elements to preserve order
                elements.filter((el) => found.has(el)))
        : [];
}
function filterBySelector(selector, elements, options) {
    var _a;
    if (selector.some(isTraversal$1)) {
        /*
         * Get root node, run selector with the scope
         * set to all of our nodes.
         */
        const root = (_a = options.root) !== null && _a !== void 0 ? _a : getDocumentRoot(elements[0]);
        const opts = { ...options, context: elements, relativeSelector: false };
        selector.push(SCOPE_PSEUDO);
        return findFilterElements(root, selector, opts, true, elements.length);
    }
    // Performance optimization: If we don't have to traverse, just filter set.
    return findFilterElements(elements, selector, options, false, elements.length);
}
function select(selector, root, options = {}, limit = Infinity) {
    if (typeof selector === "function") {
        return find$1(root, selector);
    }
    const [plain, filtered] = groupSelectors(parse$4(selector));
    const results = filtered.map((sel) => findFilterElements(root, sel, options, true, limit));
    // Plain selectors can be queried in a single go
    if (plain.length) {
        results.push(findElements(root, plain, options, limit));
    }
    if (results.length === 0) {
        return [];
    }
    // If there was only a single selector, just return the result
    if (results.length === 1) {
        return results[0];
    }
    // Sort results, filtering for duplicates
    return uniqueSort(results.reduce((a, b) => [...a, ...b]));
}
/**
 *
 * @param root Element(s) to search from.
 * @param selector Selector to look for.
 * @param options Options for querying.
 * @param queryForSelector Query multiple levels deep for the initial selector, even if it doesn't contain a traversal.
 */
function findFilterElements(root, selector, options, queryForSelector, totalLimit) {
    const filterIndex = selector.findIndex(isFilter);
    const sub = selector.slice(0, filterIndex);
    const filter = selector[filterIndex];
    // If we are at the end of the selector, we can limit the number of elements to retrieve.
    const partLimit = selector.length - 1 === filterIndex ? totalLimit : Infinity;
    /*
     * Set the number of elements to retrieve.
     * Eg. for :first, we only have to get a single element.
     */
    const limit = getLimit(filter.name, filter.data, partLimit);
    if (limit === 0)
        return [];
    /*
     * Skip `findElements` call if our selector starts with a positional
     * pseudo.
     */
    const elemsNoLimit = sub.length === 0 && !Array.isArray(root)
        ? getChildren(root).filter(isTag)
        : sub.length === 0
            ? (Array.isArray(root) ? root : [root]).filter(isTag)
            : queryForSelector || sub.some(isTraversal$1)
                ? findElements(root, [sub], options, limit)
                : filterElements(root, [sub], options);
    const elems = elemsNoLimit.slice(0, limit);
    let result = filterByPosition(filter.name, elems, filter.data, options);
    if (result.length === 0 || selector.length === filterIndex + 1) {
        return result;
    }
    const remainingSelector = selector.slice(filterIndex + 1);
    const remainingHasTraversal = remainingSelector.some(isTraversal$1);
    if (remainingHasTraversal) {
        if (isTraversal$1(remainingSelector[0])) {
            const { type } = remainingSelector[0];
            if (type === SelectorType.Sibling ||
                type === SelectorType.Adjacent) {
                // If we have a sibling traversal, we need to also look at the siblings.
                result = prepareContext(result, DomUtils, true);
            }
            // Avoid a traversal-first selector error.
            remainingSelector.unshift(UNIVERSAL_SELECTOR);
        }
        options = {
            ...options,
            // Avoid absolutizing the selector
            relativeSelector: false,
            /*
             * Add a custom root func, to make sure traversals don't match elements
             * that aren't a part of the considered tree.
             */
            rootFunc: (el) => result.includes(el),
        };
    }
    else if (options.rootFunc && options.rootFunc !== boolbase.trueFunc) {
        options = { ...options, rootFunc: boolbase.trueFunc };
    }
    /*
     * If we have another filter, recursively call `findFilterElements`,
     * with the `recursive` flag disabled. We only have to look for more
     * elements when we see a traversal.
     *
     * Otherwise,
     */
    return remainingSelector.some(isFilter)
        ? findFilterElements(result, remainingSelector, options, false, totalLimit)
        : remainingHasTraversal
            ? // Query existing elements to resolve traversal.
                findElements(result, [remainingSelector], options, totalLimit)
            : // If we don't have any more traversals, simply filter elements.
                filterElements(result, [remainingSelector], options);
}
function findElements(root, sel, options, limit) {
    const query = _compileToken(sel, options, root);
    return find$1(root, query, limit);
}
function find$1(root, query, limit = Infinity) {
    const elems = prepareContext(root, DomUtils, query.shouldTestNextSiblings);
    return find$2((node) => isTag(node) && query(node), elems, true, limit);
}
function filterElements(elements, sel, options) {
    const els = (Array.isArray(elements) ? elements : [elements]).filter(isTag);
    if (els.length === 0)
        return els;
    const query = _compileToken(sel, options);
    return query === boolbase.trueFunc ? els : els.filter(query);
}

/**
 * Methods for traversing the DOM structure.
 *
 * @module cheerio/traversing
 */
const reSiblingSelector = /^\s*[+~]/;
/**
 * Get the descendants of each element in the current set of matched elements,
 * filtered by a selector, jQuery object, or element.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('#fruits').find('li').length;
 * //=> 3
 * $('#fruits').find($('.apple')).length;
 * //=> 1
 * ```
 *
 * @param selectorOrHaystack - Element to look for.
 * @returns The found elements.
 * @see {@link https://api.jquery.com/find/}
 */
function find(selectorOrHaystack) {
    if (!selectorOrHaystack) {
        return this._make([]);
    }
    if (typeof selectorOrHaystack !== 'string') {
        const haystack = isCheerio(selectorOrHaystack)
            ? selectorOrHaystack.toArray()
            : [selectorOrHaystack];
        const context = this.toArray();
        return this._make(haystack.filter((elem) => context.some((node) => contains(node, elem))));
    }
    return this._findBySelector(selectorOrHaystack, Number.POSITIVE_INFINITY);
}
/**
 * Find elements by a specific selector.
 *
 * @private
 * @category Traversing
 * @param selector - Selector to filter by.
 * @param limit - Maximum number of elements to match.
 * @returns The found elements.
 */
function _findBySelector(selector, limit) {
    var _a;
    const context = this.toArray();
    const elems = reSiblingSelector.test(selector)
        ? context
        : this.children().toArray();
    const options = {
        context,
        root: (_a = this._root) === null || _a === void 0 ? void 0 : _a[0],
        // Pass options that are recognized by `cheerio-select`
        xmlMode: this.options.xmlMode,
        lowerCaseTags: this.options.lowerCaseTags,
        lowerCaseAttributeNames: this.options.lowerCaseAttributeNames,
        pseudos: this.options.pseudos,
        quirksMode: this.options.quirksMode,
    };
    return this._make(select(selector, elems, options, limit));
}
/**
 * Creates a matcher, using a particular mapping function. Matchers provide a
 * function that finds elements using a generating function, supporting
 * filtering.
 *
 * @private
 * @param matchMap - Mapping function.
 * @returns - Function for wrapping generating functions.
 */
function _getMatcher(matchMap) {
    return function (fn, ...postFns) {
        return function (selector) {
            var _a;
            let matched = matchMap(fn, this);
            if (selector) {
                matched = filterArray(matched, selector, this.options.xmlMode, (_a = this._root) === null || _a === void 0 ? void 0 : _a[0]);
            }
            return this._make(
            // Post processing is only necessary if there is more than one element.
            this.length > 1 && matched.length > 1
                ? postFns.reduce((elems, fn) => fn(elems), matched)
                : matched);
        };
    };
}
/** Matcher that adds multiple elements for each entry in the input. */
const _matcher = _getMatcher((fn, elems) => {
    let ret = [];
    for (let i = 0; i < elems.length; i++) {
        const value = fn(elems[i]);
        if (value.length > 0)
            ret = ret.concat(value);
    }
    return ret;
});
/** Matcher that adds at most one element for each entry in the input. */
const _singleMatcher = _getMatcher((fn, elems) => {
    const ret = [];
    for (let i = 0; i < elems.length; i++) {
        const value = fn(elems[i]);
        if (value !== null) {
            ret.push(value);
        }
    }
    return ret;
});
/**
 * Matcher that supports traversing until a condition is met.
 *
 * @param nextElem - Function that returns the next element.
 * @param postFns - Post processing functions.
 * @returns A function usable for `*Until` methods.
 */
function _matchUntil(nextElem, ...postFns) {
    // We use a variable here that is used from within the matcher.
    let matches = null;
    const innerMatcher = _getMatcher((nextElem, elems) => {
        const matched = [];
        domEach(elems, (elem) => {
            for (let next; (next = nextElem(elem)); elem = next) {
                // FIXME: `matched` might contain duplicates here and the index is too large.
                if (matches === null || matches === void 0 ? void 0 : matches(next, matched.length))
                    break;
                matched.push(next);
            }
        });
        return matched;
    })(nextElem, ...postFns);
    return function (selector, filterSelector) {
        // Override `matches` variable with the new target.
        matches =
            typeof selector === 'string'
                ? (elem) => is$1(elem, selector, this.options)
                : selector
                    ? getFilterFn(selector)
                    : null;
        const ret = innerMatcher.call(this, filterSelector);
        // Set `matches` to `null`, so we don't waste memory.
        matches = null;
        return ret;
    };
}
function _removeDuplicates(elems) {
    return elems.length > 1 ? Array.from(new Set(elems)) : elems;
}
/**
 * Get the parent of each element in the current set of matched elements,
 * optionally filtered by a selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.pear').parent().attr('id');
 * //=> fruits
 * ```
 *
 * @param selector - If specified filter for parent.
 * @returns The parents.
 * @see {@link https://api.jquery.com/parent/}
 */
const parent = _singleMatcher(({ parent }) => (parent && !isDocument(parent) ? parent : null), _removeDuplicates);
/**
 * Get a set of parents filtered by `selector` of each element in the current
 * set of match elements.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.orange').parents().length;
 * //=> 2
 * $('.orange').parents('#fruits').length;
 * //=> 1
 * ```
 *
 * @param selector - If specified filter for parents.
 * @returns The parents.
 * @see {@link https://api.jquery.com/parents/}
 */
const parents = _matcher((elem) => {
    const matched = [];
    while (elem.parent && !isDocument(elem.parent)) {
        matched.push(elem.parent);
        elem = elem.parent;
    }
    return matched;
}, uniqueSort, (elems) => elems.reverse());
/**
 * Get the ancestors of each element in the current set of matched elements, up
 * to but not including the element matched by the selector, DOM node, or
 * cheerio object.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.orange').parentsUntil('#food').length;
 * //=> 1
 * ```
 *
 * @param selector - Selector for element to stop at.
 * @param filterSelector - Optional filter for parents.
 * @returns The parents.
 * @see {@link https://api.jquery.com/parentsUntil/}
 */
const parentsUntil = _matchUntil(({ parent }) => (parent && !isDocument(parent) ? parent : null), uniqueSort, (elems) => elems.reverse());
/**
 * For each element in the set, get the first element that matches the selector
 * by testing the element itself and traversing up through its ancestors in the
 * DOM tree.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.orange').closest();
 * //=> []
 *
 * $('.orange').closest('.apple');
 * // => []
 *
 * $('.orange').closest('li');
 * //=> [<li class="orange">Orange</li>]
 *
 * $('.orange').closest('#fruits');
 * //=> [<ul id="fruits"> ... </ul>]
 * ```
 *
 * @param selector - Selector for the element to find.
 * @returns The closest nodes.
 * @see {@link https://api.jquery.com/closest/}
 */
function closest(selector) {
    var _a;
    const set = [];
    if (!selector) {
        return this._make(set);
    }
    const selectOpts = {
        xmlMode: this.options.xmlMode,
        root: (_a = this._root) === null || _a === void 0 ? void 0 : _a[0],
    };
    const selectFn = typeof selector === 'string'
        ? (elem) => is$1(elem, selector, selectOpts)
        : getFilterFn(selector);
    domEach(this, (elem) => {
        if (elem && !isDocument(elem) && !isTag(elem)) {
            elem = elem.parent;
        }
        while (elem && isTag(elem)) {
            if (selectFn(elem, 0)) {
                // Do not add duplicate elements to the set
                if (!set.includes(elem)) {
                    set.push(elem);
                }
                break;
            }
            elem = elem.parent;
        }
    });
    return this._make(set);
}
/**
 * Gets the next sibling of each selected element, optionally filtered by a
 * selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.apple').next().hasClass('orange');
 * //=> true
 * ```
 *
 * @param selector - If specified filter for sibling.
 * @returns The next nodes.
 * @see {@link https://api.jquery.com/next/}
 */
const next = _singleMatcher((elem) => nextElementSibling(elem));
/**
 * Gets all the following siblings of the each selected element, optionally
 * filtered by a selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.apple').nextAll();
 * //=> [<li class="orange">Orange</li>, <li class="pear">Pear</li>]
 * $('.apple').nextAll('.orange');
 * //=> [<li class="orange">Orange</li>]
 * ```
 *
 * @param selector - If specified filter for siblings.
 * @returns The next nodes.
 * @see {@link https://api.jquery.com/nextAll/}
 */
const nextAll = _matcher((elem) => {
    const matched = [];
    while (elem.next) {
        elem = elem.next;
        if (isTag(elem))
            matched.push(elem);
    }
    return matched;
}, _removeDuplicates);
/**
 * Gets all the following siblings up to but not including the element matched
 * by the selector, optionally filtered by another selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.apple').nextUntil('.pear');
 * //=> [<li class="orange">Orange</li>]
 * ```
 *
 * @param selector - Selector for element to stop at.
 * @param filterSelector - If specified filter for siblings.
 * @returns The next nodes.
 * @see {@link https://api.jquery.com/nextUntil/}
 */
const nextUntil = _matchUntil((el) => nextElementSibling(el), _removeDuplicates);
/**
 * Gets the previous sibling of each selected element optionally filtered by a
 * selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.orange').prev().hasClass('apple');
 * //=> true
 * ```
 *
 * @param selector - If specified filter for siblings.
 * @returns The previous nodes.
 * @see {@link https://api.jquery.com/prev/}
 */
const prev = _singleMatcher((elem) => prevElementSibling(elem));
/**
 * Gets all the preceding siblings of each selected element, optionally filtered
 * by a selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.pear').prevAll();
 * //=> [<li class="orange">Orange</li>, <li class="apple">Apple</li>]
 *
 * $('.pear').prevAll('.orange');
 * //=> [<li class="orange">Orange</li>]
 * ```
 *
 * @param selector - If specified filter for siblings.
 * @returns The previous nodes.
 * @see {@link https://api.jquery.com/prevAll/}
 */
const prevAll = _matcher((elem) => {
    const matched = [];
    while (elem.prev) {
        elem = elem.prev;
        if (isTag(elem))
            matched.push(elem);
    }
    return matched;
}, _removeDuplicates);
/**
 * Gets all the preceding siblings up to but not including the element matched
 * by the selector, optionally filtered by another selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.pear').prevUntil('.apple');
 * //=> [<li class="orange">Orange</li>]
 * ```
 *
 * @param selector - Selector for element to stop at.
 * @param filterSelector - If specified filter for siblings.
 * @returns The previous nodes.
 * @see {@link https://api.jquery.com/prevUntil/}
 */
const prevUntil = _matchUntil((el) => prevElementSibling(el), _removeDuplicates);
/**
 * Get the siblings of each element (excluding the element) in the set of
 * matched elements, optionally filtered by a selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.pear').siblings().length;
 * //=> 2
 *
 * $('.pear').siblings('.orange').length;
 * //=> 1
 * ```
 *
 * @param selector - If specified filter for siblings.
 * @returns The siblings.
 * @see {@link https://api.jquery.com/siblings/}
 */
const siblings = _matcher((elem) => getSiblings(elem).filter((el) => isTag(el) && el !== elem), uniqueSort);
/**
 * Gets the element children of each element in the set of matched elements.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('#fruits').children().length;
 * //=> 3
 *
 * $('#fruits').children('.pear').text();
 * //=> Pear
 * ```
 *
 * @param selector - If specified filter for children.
 * @returns The children.
 * @see {@link https://api.jquery.com/children/}
 */
const children = _matcher((elem) => getChildren(elem).filter(isTag), _removeDuplicates);
/**
 * Gets the children of each element in the set of matched elements, including
 * text and comment nodes.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('#fruits').contents().length;
 * //=> 3
 * ```
 *
 * @returns The children.
 * @see {@link https://api.jquery.com/contents/}
 */
function contents() {
    const elems = this.toArray().reduce((newElems, elem) => hasChildren(elem) ? newElems.concat(elem.children) : newElems, []);
    return this._make(elems);
}
/**
 * Iterates over a cheerio object, executing a function for each matched
 * element. When the callback is fired, the function is fired in the context of
 * the DOM element, so `this` refers to the current element, which is equivalent
 * to the function parameter `element`. To break out of the `each` loop early,
 * return with `false`.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * const fruits = [];
 *
 * $('li').each(function (i, elem) {
 *   fruits[i] = $(this).text();
 * });
 *
 * fruits.join(', ');
 * //=> Apple, Orange, Pear
 * ```
 *
 * @param fn - Function to execute.
 * @returns The instance itself, useful for chaining.
 * @see {@link https://api.jquery.com/each/}
 */
function each(fn) {
    let i = 0;
    const len = this.length;
    while (i < len && fn.call(this[i], i, this[i]) !== false)
        ++i;
    return this;
}
/**
 * Pass each element in the current matched set through a function, producing a
 * new Cheerio object containing the return values. The function can return an
 * individual data item or an array of data items to be inserted into the
 * resulting set. If an array is returned, the elements inside the array are
 * inserted into the set. If the function returns null or undefined, no element
 * will be inserted.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('li')
 *   .map(function (i, el) {
 *     // this === el
 *     return $(this).text();
 *   })
 *   .toArray()
 *   .join(' ');
 * //=> "apple orange pear"
 * ```
 *
 * @param fn - Function to execute.
 * @returns The mapped elements, wrapped in a Cheerio collection.
 * @see {@link https://api.jquery.com/map/}
 */
function map(fn) {
    let elems = [];
    for (let i = 0; i < this.length; i++) {
        const el = this[i];
        const val = fn.call(el, i, el);
        if (val != null) {
            elems = elems.concat(val);
        }
    }
    return this._make(elems);
}
/**
 * Creates a function to test if a filter is matched.
 *
 * @param match - A filter.
 * @returns A function that determines if a filter has been matched.
 */
function getFilterFn(match) {
    if (typeof match === 'function') {
        return (el, i) => match.call(el, i, el);
    }
    if (isCheerio(match)) {
        return (el) => Array.prototype.includes.call(match, el);
    }
    return function (el) {
        return match === el;
    };
}
function filter(match) {
    var _a;
    return this._make(filterArray(this.toArray(), match, this.options.xmlMode, (_a = this._root) === null || _a === void 0 ? void 0 : _a[0]));
}
function filterArray(nodes, match, xmlMode, root) {
    return typeof match === 'string'
        ? filter$1(match, nodes, { xmlMode, root })
        : nodes.filter(getFilterFn(match));
}
/**
 * Checks the current list of elements and returns `true` if _any_ of the
 * elements match the selector. If using an element or Cheerio selection,
 * returns `true` if _any_ of the elements match. If using a predicate function,
 * the function is executed in the context of the selected element, so `this`
 * refers to the current element.
 *
 * @category Traversing
 * @param selector - Selector for the selection.
 * @returns Whether or not the selector matches an element of the instance.
 * @see {@link https://api.jquery.com/is/}
 */
function is(selector) {
    const nodes = this.toArray();
    return typeof selector === 'string'
        ? some(nodes.filter(isTag), selector, this.options)
        : selector
            ? nodes.some(getFilterFn(selector))
            : false;
}
/**
 * Remove elements from the set of matched elements. Given a Cheerio object that
 * represents a set of DOM elements, the `.not()` method constructs a new
 * Cheerio object from a subset of the matching elements. The supplied selector
 * is tested against each element; the elements that don't match the selector
 * will be included in the result.
 *
 * The `.not()` method can take a function as its argument in the same way that
 * `.filter()` does. Elements for which the function returns `true` are excluded
 * from the filtered set; all other elements are included.
 *
 * @category Traversing
 * @example <caption>Selector</caption>
 *
 * ```js
 * $('li').not('.apple').length;
 * //=> 2
 * ```
 *
 * @example <caption>Function</caption>
 *
 * ```js
 * $('li').not(function (i, el) {
 *   // this === el
 *   return $(this).attr('class') === 'orange';
 * }).length; //=> 2
 * ```
 *
 * @param match - Value to look for, following the rules above.
 * @returns The filtered collection.
 * @see {@link https://api.jquery.com/not/}
 */
function not(match) {
    let nodes = this.toArray();
    if (typeof match === 'string') {
        const matches = new Set(filter$1(match, nodes, this.options));
        nodes = nodes.filter((el) => !matches.has(el));
    }
    else {
        const filterFn = getFilterFn(match);
        nodes = nodes.filter((el, i) => !filterFn(el, i));
    }
    return this._make(nodes);
}
/**
 * Filters the set of matched elements to only those which have the given DOM
 * element as a descendant or which have a descendant that matches the given
 * selector. Equivalent to `.filter(':has(selector)')`.
 *
 * @category Traversing
 * @example <caption>Selector</caption>
 *
 * ```js
 * $('ul').has('.pear').attr('id');
 * //=> fruits
 * ```
 *
 * @example <caption>Element</caption>
 *
 * ```js
 * $('ul').has($('.pear')[0]).attr('id');
 * //=> fruits
 * ```
 *
 * @param selectorOrHaystack - Element to look for.
 * @returns The filtered collection.
 * @see {@link https://api.jquery.com/has/}
 */
function has(selectorOrHaystack) {
    return this.filter(typeof selectorOrHaystack === 'string'
        ? // Using the `:has` selector here short-circuits searches.
            `:has(${selectorOrHaystack})`
        : (_, el) => this._make(el).find(selectorOrHaystack).length > 0);
}
/**
 * Will select the first element of a cheerio object.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('#fruits').children().first().text();
 * //=> Apple
 * ```
 *
 * @returns The first element.
 * @see {@link https://api.jquery.com/first/}
 */
function first() {
    return this.length > 1 ? this._make(this[0]) : this;
}
/**
 * Will select the last element of a cheerio object.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('#fruits').children().last().text();
 * //=> Pear
 * ```
 *
 * @returns The last element.
 * @see {@link https://api.jquery.com/last/}
 */
function last() {
    return this.length > 0 ? this._make(this[this.length - 1]) : this;
}
/**
 * Reduce the set of matched elements to the one at the specified index. Use
 * `.eq(-i)` to count backwards from the last selected element.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('li').eq(0).text();
 * //=> Apple
 *
 * $('li').eq(-1).text();
 * //=> Pear
 * ```
 *
 * @param i - Index of the element to select.
 * @returns The element at the `i`th position.
 * @see {@link https://api.jquery.com/eq/}
 */
function eq(i) {
    var _a;
    i = +i;
    // Use the first identity optimization if possible
    if (i === 0 && this.length <= 1)
        return this;
    if (i < 0)
        i = this.length + i;
    return this._make((_a = this[i]) !== null && _a !== void 0 ? _a : []);
}
function get(i) {
    if (i == null) {
        return this.toArray();
    }
    return this[i < 0 ? this.length + i : i];
}
/**
 * Retrieve all the DOM elements contained in the jQuery set as an array.
 *
 * @example
 *
 * ```js
 * $('li').toArray();
 * //=> [ {...}, {...}, {...} ]
 * ```
 *
 * @returns The contained items.
 */
function toArray() {
    return Array.prototype.slice.call(this);
}
/**
 * Search for a given element from among the matched elements.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.pear').index();
 * //=> 2 $('.orange').index('li');
 * //=> 1
 * $('.apple').index($('#fruit, li'));
 * //=> 1
 * ```
 *
 * @param selectorOrNeedle - Element to look for.
 * @returns The index of the element.
 * @see {@link https://api.jquery.com/index/}
 */
function index$1(selectorOrNeedle) {
    let $haystack;
    let needle;
    if (selectorOrNeedle == null) {
        $haystack = this.parent().children();
        needle = this[0];
    }
    else if (typeof selectorOrNeedle === 'string') {
        $haystack = this._make(selectorOrNeedle);
        needle = this[0];
    }
    else {
        // eslint-disable-next-line @typescript-eslint/no-this-alias, unicorn/no-this-assignment
        $haystack = this;
        needle = isCheerio(selectorOrNeedle)
            ? selectorOrNeedle[0]
            : selectorOrNeedle;
    }
    return Array.prototype.indexOf.call($haystack, needle);
}
/**
 * Gets the elements matching the specified range (0-based position).
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('li').slice(1).eq(0).text();
 * //=> 'Orange'
 *
 * $('li').slice(1, 2).length;
 * //=> 1
 * ```
 *
 * @param start - A position at which the elements begin to be selected. If
 *   negative, it indicates an offset from the end of the set.
 * @param end - A position at which the elements stop being selected. If
 *   negative, it indicates an offset from the end of the set. If omitted, the
 *   range continues until the end of the set.
 * @returns The elements matching the specified range.
 * @see {@link https://api.jquery.com/slice/}
 */
function slice(start, end) {
    return this._make(Array.prototype.slice.call(this, start, end));
}
/**
 * End the most recent filtering operation in the current chain and return the
 * set of matched elements to its previous state.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('li').eq(0).end().length;
 * //=> 3
 * ```
 *
 * @returns The previous state of the set of matched elements.
 * @see {@link https://api.jquery.com/end/}
 */
function end() {
    var _a;
    return (_a = this.prevObject) !== null && _a !== void 0 ? _a : this._make([]);
}
/**
 * Add elements to the set of matched elements.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.apple').add('.orange').length;
 * //=> 2
 * ```
 *
 * @param other - Elements to add.
 * @param context - Optionally the context of the new selection.
 * @returns The combined set.
 * @see {@link https://api.jquery.com/add/}
 */
function add(other, context) {
    const selection = this._make(other, context);
    const contents = uniqueSort([...this.get(), ...selection.get()]);
    return this._make(contents);
}
/**
 * Add the previous set of elements on the stack to the current set, optionally
 * filtered by a selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('li').eq(0).addBack('.orange').length;
 * //=> 2
 * ```
 *
 * @param selector - Selector for the elements to add.
 * @returns The combined set.
 * @see {@link https://api.jquery.com/addBack/}
 */
function addBack(selector) {
    return this.prevObject
        ? this.add(selector ? this.prevObject.filter(selector) : this.prevObject)
        : this;
}

var Traversing = /*#__PURE__*/Object.freeze({
    __proto__: null,
    find: find,
    _findBySelector: _findBySelector,
    parent: parent,
    parents: parents,
    parentsUntil: parentsUntil,
    closest: closest,
    next: next,
    nextAll: nextAll,
    nextUntil: nextUntil,
    prev: prev,
    prevAll: prevAll,
    prevUntil: prevUntil,
    siblings: siblings,
    children: children,
    contents: contents,
    each: each,
    map: map,
    filter: filter,
    filterArray: filterArray,
    is: is,
    not: not,
    has: has,
    first: first,
    last: last,
    eq: eq,
    get: get,
    toArray: toArray,
    index: index$1,
    slice: slice,
    end: end,
    add: add,
    addBack: addBack
});

var global$1 = (typeof global !== "undefined" ? global :
  typeof self !== "undefined" ? self :
  typeof window !== "undefined" ? window : {});

var lookup = [];
var revLookup = [];
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
var inited = false;
function init () {
  inited = true;
  var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (var i = 0, len = code.length; i < len; ++i) {
    lookup[i] = code[i];
    revLookup[code.charCodeAt(i)] = i;
  }

  revLookup['-'.charCodeAt(0)] = 62;
  revLookup['_'.charCodeAt(0)] = 63;
}

function toByteArray (b64) {
  if (!inited) {
    init();
  }
  var i, j, l, tmp, placeHolders, arr;
  var len = b64.length;

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0;

  // base64 is 4/3 + up to two characters of the original data
  arr = new Arr(len * 3 / 4 - placeHolders);

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len;

  var L = 0;

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)];
    arr[L++] = (tmp >> 16) & 0xFF;
    arr[L++] = (tmp >> 8) & 0xFF;
    arr[L++] = tmp & 0xFF;
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4);
    arr[L++] = tmp & 0xFF;
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2);
    arr[L++] = (tmp >> 8) & 0xFF;
    arr[L++] = tmp & 0xFF;
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp;
  var output = [];
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
    output.push(tripletToBase64(tmp));
  }
  return output.join('')
}

function fromByteArray (uint8) {
  if (!inited) {
    init();
  }
  var tmp;
  var len = uint8.length;
  var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
  var output = '';
  var parts = [];
  var maxChunkLength = 16383; // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1];
    output += lookup[tmp >> 2];
    output += lookup[(tmp << 4) & 0x3F];
    output += '==';
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1]);
    output += lookup[tmp >> 10];
    output += lookup[(tmp >> 4) & 0x3F];
    output += lookup[(tmp << 2) & 0x3F];
    output += '=';
  }

  parts.push(output);

  return parts.join('')
}

function read (buffer, offset, isLE, mLen, nBytes) {
  var e, m;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var nBits = -7;
  var i = isLE ? (nBytes - 1) : 0;
  var d = isLE ? -1 : 1;
  var s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

function write (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
  var i = isLE ? 0 : (nBytes - 1);
  var d = isLE ? 1 : -1;
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128;
}

var toString$1 = {}.toString;

var isArray = Array.isArray || function (arr) {
  return toString$1.call(arr) == '[object Array]';
};

/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var INSPECT_MAX_BYTES = 50;

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global$1.TYPED_ARRAY_SUPPORT !== undefined
  ? global$1.TYPED_ARRAY_SUPPORT
  : true;

/*
 * Export kMaxLength after typed array support is determined.
 */
kMaxLength();

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length);
    that.__proto__ = Buffer.prototype;
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length);
    }
    that.length = length;
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192; // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype;
  return arr
};

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
};

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype;
  Buffer.__proto__ = Uint8Array;
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size);
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
};

function allocUnsafe (that, size) {
  assertSize(size);
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0);
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0;
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
};
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
};

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8';
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0;
  that = createBuffer(that, length);

  var actual = that.write(string, encoding);

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual);
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0;
  that = createBuffer(that, length);
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255;
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength; // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array);
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset);
  } else {
    array = new Uint8Array(array, byteOffset, length);
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array;
    that.__proto__ = Buffer.prototype;
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array);
  }
  return that
}

function fromObject (that, obj) {
  if (internalIsBuffer(obj)) {
    var len = checked(obj.length) | 0;
    that = createBuffer(that, len);

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len);
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}
Buffer.isBuffer = isBuffer;
function internalIsBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!internalIsBuffer(a) || !internalIsBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length;
  var y = b.length;

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i];
      y = b[i];
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
};

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
};

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i;
  if (length === undefined) {
    length = 0;
    for (i = 0; i < list.length; ++i) {
      length += list[i].length;
    }
  }

  var buffer = Buffer.allocUnsafe(length);
  var pos = 0;
  for (i = 0; i < list.length; ++i) {
    var buf = list[i];
    if (!internalIsBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer
};

function byteLength (string, encoding) {
  if (internalIsBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string;
  }

  var len = string.length;
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false;
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase();
        loweredCase = true;
    }
  }
}
Buffer.byteLength = byteLength;

function slowToString (encoding, start, end) {
  var loweredCase = false;

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0;
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length;
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0;
  start >>>= 0;

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8';

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase();
        loweredCase = true;
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true;

function swap (b, n, m) {
  var i = b[n];
  b[n] = b[m];
  b[m] = i;
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length;
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1);
  }
  return this
};

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length;
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3);
    swap(this, i + 1, i + 2);
  }
  return this
};

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length;
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7);
    swap(this, i + 1, i + 6);
    swap(this, i + 2, i + 5);
    swap(this, i + 3, i + 4);
  }
  return this
};

Buffer.prototype.toString = function toString () {
  var length = this.length | 0;
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
};

Buffer.prototype.equals = function equals (b) {
  if (!internalIsBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
};

Buffer.prototype.inspect = function inspect () {
  var str = '';
  var max = INSPECT_MAX_BYTES;
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
    if (this.length > max) str += ' ... ';
  }
  return '<Buffer ' + str + '>'
};

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!internalIsBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0;
  }
  if (end === undefined) {
    end = target ? target.length : 0;
  }
  if (thisStart === undefined) {
    thisStart = 0;
  }
  if (thisEnd === undefined) {
    thisEnd = this.length;
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0;
  end >>>= 0;
  thisStart >>>= 0;
  thisEnd >>>= 0;

  if (this === target) return 0

  var x = thisEnd - thisStart;
  var y = end - start;
  var len = Math.min(x, y);

  var thisCopy = this.slice(thisStart, thisEnd);
  var targetCopy = target.slice(start, end);

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i];
      y = targetCopy[i];
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
};

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset;
    byteOffset = 0;
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff;
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000;
  }
  byteOffset = +byteOffset;  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1);
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1;
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0;
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding);
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (internalIsBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF; // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1;
  var arrLength = arr.length;
  var valLength = val.length;

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase();
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2;
      arrLength /= 2;
      valLength /= 2;
      byteOffset /= 2;
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i;
  if (dir) {
    var foundIndex = -1;
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i;
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex;
        foundIndex = -1;
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
    for (i = byteOffset; i >= 0; i--) {
      var found = true;
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false;
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
};

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
};

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
};

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0;
  var remaining = buf.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = Number(length);
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed;
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8';
    length = this.length;
    offset = 0;
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset;
    length = this.length;
    offset = 0;
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0;
    if (isFinite(length)) {
      length = length | 0;
      if (encoding === undefined) encoding = 'utf8';
    } else {
      encoding = length;
      length = undefined;
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset;
  if (length === undefined || length > remaining) length = remaining;

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8';

  var loweredCase = false;
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase();
        loweredCase = true;
    }
  }
};

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
};

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return fromByteArray(buf)
  } else {
    return fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end);
  var res = [];

  var i = start;
  while (i < end) {
    var firstByte = buf[i];
    var codePoint = null;
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1;

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint;

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte;
          }
          break
        case 2:
          secondByte = buf[i + 1];
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint;
            }
          }
          break
        case 3:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint;
            }
          }
          break
        case 4:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          fourthByte = buf[i + 3];
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint;
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD;
      bytesPerSequence = 1;
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000;
      res.push(codePoint >>> 10 & 0x3FF | 0xD800);
      codePoint = 0xDC00 | codePoint & 0x3FF;
    }

    res.push(codePoint);
    i += bytesPerSequence;
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000;

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length;
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = '';
  var i = 0;
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    );
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = '';
  end = Math.min(buf.length, end);

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F);
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = '';
  end = Math.min(buf.length, end);

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i]);
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i]);
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end);
  var res = '';
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length;
  start = ~~start;
  end = end === undefined ? len : ~~end;

  if (start < 0) {
    start += len;
    if (start < 0) start = 0;
  } else if (start > len) {
    start = len;
  }

  if (end < 0) {
    end += len;
    if (end < 0) end = 0;
  } else if (end > len) {
    end = len;
  }

  if (end < start) end = start;

  var newBuf;
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end);
    newBuf.__proto__ = Buffer.prototype;
  } else {
    var sliceLen = end - start;
    newBuf = new Buffer(sliceLen, undefined);
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start];
    }
  }

  return newBuf
};

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var val = this[offset];
  var mul = 1;
  var i = 0;
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul;
  }

  return val
};

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length);
  }

  var val = this[offset + --byteLength];
  var mul = 1;
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul;
  }

  return val
};

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length);
  return this[offset]
};

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  return this[offset] | (this[offset + 1] << 8)
};

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  return (this[offset] << 8) | this[offset + 1]
};

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
};

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
};

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var val = this[offset];
  var mul = 1;
  var i = 0;
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul;
  }
  mul *= 0x80;

  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

  return val
};

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var i = byteLength;
  var mul = 1;
  var val = this[offset + --i];
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul;
  }
  mul *= 0x80;

  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

  return val
};

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length);
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
};

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  var val = this[offset] | (this[offset + 1] << 8);
  return (val & 0x8000) ? val | 0xFFFF0000 : val
};

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  var val = this[offset + 1] | (this[offset] << 8);
  return (val & 0x8000) ? val | 0xFFFF0000 : val
};

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
};

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
};

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);
  return read(this, offset, true, 23, 4)
};

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);
  return read(this, offset, false, 23, 4)
};

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length);
  return read(this, offset, true, 52, 8)
};

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length);
  return read(this, offset, false, 52, 8)
};

function checkInt (buf, value, offset, ext, max, min) {
  if (!internalIsBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
    checkInt(this, value, offset, byteLength, maxBytes, 0);
  }

  var mul = 1;
  var i = 0;
  this[offset] = value & 0xFF;
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
    checkInt(this, value, offset, byteLength, maxBytes, 0);
  }

  var i = byteLength - 1;
  var mul = 1;
  this[offset + i] = value & 0xFF;
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
  this[offset] = (value & 0xff);
  return offset + 1
};

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1;
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8;
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
  } else {
    objectWriteUInt16(this, value, offset, true);
  }
  return offset + 2
};

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8);
    this[offset + 1] = (value & 0xff);
  } else {
    objectWriteUInt16(this, value, offset, false);
  }
  return offset + 2
};

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1;
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff;
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24);
    this[offset + 2] = (value >>> 16);
    this[offset + 1] = (value >>> 8);
    this[offset] = (value & 0xff);
  } else {
    objectWriteUInt32(this, value, offset, true);
  }
  return offset + 4
};

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24);
    this[offset + 1] = (value >>> 16);
    this[offset + 2] = (value >>> 8);
    this[offset + 3] = (value & 0xff);
  } else {
    objectWriteUInt32(this, value, offset, false);
  }
  return offset + 4
};

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1);

    checkInt(this, value, offset, byteLength, limit - 1, -limit);
  }

  var i = 0;
  var mul = 1;
  var sub = 0;
  this[offset] = value & 0xFF;
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1);

    checkInt(this, value, offset, byteLength, limit - 1, -limit);
  }

  var i = byteLength - 1;
  var mul = 1;
  var sub = 0;
  this[offset + i] = value & 0xFF;
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
  if (value < 0) value = 0xff + value + 1;
  this[offset] = (value & 0xff);
  return offset + 1
};

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
  } else {
    objectWriteUInt16(this, value, offset, true);
  }
  return offset + 2
};

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8);
    this[offset + 1] = (value & 0xff);
  } else {
    objectWriteUInt16(this, value, offset, false);
  }
  return offset + 2
};

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
    this[offset + 2] = (value >>> 16);
    this[offset + 3] = (value >>> 24);
  } else {
    objectWriteUInt32(this, value, offset, true);
  }
  return offset + 4
};

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
  if (value < 0) value = 0xffffffff + value + 1;
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24);
    this[offset + 1] = (value >>> 16);
    this[offset + 2] = (value >>> 8);
    this[offset + 3] = (value & 0xff);
  } else {
    objectWriteUInt32(this, value, offset, false);
  }
  return offset + 4
};

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4);
  }
  write(buf, value, offset, littleEndian, 23, 4);
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
};

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
};

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8);
  }
  write(buf, value, offset, littleEndian, 52, 8);
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
};

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
};

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0;
  if (!end && end !== 0) end = this.length;
  if (targetStart >= target.length) targetStart = target.length;
  if (!targetStart) targetStart = 0;
  if (end > 0 && end < start) end = start;

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length;
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start;
  }

  var len = end - start;
  var i;

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start];
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start];
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    );
  }

  return len
};

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start;
      start = 0;
      end = this.length;
    } else if (typeof end === 'string') {
      encoding = end;
      end = this.length;
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0);
      if (code < 256) {
        val = code;
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255;
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0;
  end = end === undefined ? this.length : end >>> 0;

  if (!val) val = 0;

  var i;
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val;
    }
  } else {
    var bytes = internalIsBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString());
    var len = bytes.length;
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len];
    }
  }

  return this
};

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '');
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '=';
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity;
  var codePoint;
  var length = string.length;
  var leadSurrogate = null;
  var bytes = [];

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i);

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          continue
        }

        // valid lead
        leadSurrogate = codePoint;

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
        leadSurrogate = codePoint;
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
    }

    leadSurrogate = null;

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      );
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = [];
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF);
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo;
  var byteArray = [];
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i);
    hi = c >> 8;
    lo = c % 256;
    byteArray.push(lo);
    byteArray.push(hi);
  }

  return byteArray
}


function base64ToBytes (str) {
  return toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i];
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}


// the following is from is-buffer, also by Feross Aboukhadijeh and with same lisence
// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
function isBuffer(obj) {
  return obj != null && (!!obj._isBuffer || isFastBuffer(obj) || isSlowBuffer(obj))
}

function isFastBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isFastBuffer(obj.slice(0, 0))
}

/**
 * Get the parse function with options.
 *
 * @param parser - The parser function.
 * @returns The parse function with options.
 */
function getParse(parser) {
    /**
     * Parse a HTML string or a node.
     *
     * @param content - The HTML string or node.
     * @param options - The parser options.
     * @param isDocument - If `content` is a document.
     * @param context - The context node in the DOM tree.
     * @returns The parsed document node.
     */
    return function parse(content, options, isDocument$1, context) {
        if (typeof Buffer !== 'undefined' && Buffer.isBuffer(content)) {
            content = content.toString();
        }
        if (typeof content === 'string') {
            return parser(content, options, isDocument$1, context);
        }
        const doc = content;
        if (!Array.isArray(doc) && isDocument(doc)) {
            // If `doc` is already a root, just return it
            return doc;
        }
        // Add conent to new root element
        const root = new Document([]);
        // Update the DOM using the root
        update(doc, root);
        return root;
    };
}
/**
 * Update the dom structure, for one changed layer.
 *
 * @param newChilds - The new children.
 * @param parent - The new parent.
 * @returns The parent node.
 */
function update(newChilds, parent) {
    // Normalize
    const arr = Array.isArray(newChilds) ? newChilds : [newChilds];
    // Update parent
    if (parent) {
        parent.children = arr;
    }
    else {
        parent = null;
    }
    // Update neighbors
    for (let i = 0; i < arr.length; i++) {
        const node = arr[i];
        // Cleanly remove existing nodes from their previous structures.
        if (node.parent && node.parent.children !== arr) {
            removeElement(node);
        }
        if (parent) {
            node.prev = arr[i - 1] || null;
            node.next = arr[i + 1] || null;
        }
        else {
            node.prev = node.next = null;
        }
        node.parent = parent;
    }
    return parent;
}

/**
 * Methods for modifying the DOM structure.
 *
 * @module cheerio/manipulation
 */
/**
 * Create an array of nodes, recursing into arrays and parsing strings if
 * necessary.
 *
 * @private
 * @category Manipulation
 * @param elem - Elements to make an array of.
 * @param clone - Optionally clone nodes.
 * @returns The array of nodes.
 */
function _makeDomArray(elem, clone) {
    if (elem == null) {
        return [];
    }
    if (typeof elem === 'string') {
        return this._parse(elem, this.options, false, null).children.slice(0);
    }
    if ('length' in elem) {
        if (elem.length === 1) {
            return this._makeDomArray(elem[0], clone);
        }
        const result = [];
        for (let i = 0; i < elem.length; i++) {
            const el = elem[i];
            if (typeof el === 'object') {
                if (el == null) {
                    continue;
                }
                if (!('length' in el)) {
                    result.push(clone ? cloneNode(el, true) : el);
                    continue;
                }
            }
            result.push(...this._makeDomArray(el, clone));
        }
        return result;
    }
    return [clone ? cloneNode(elem, true) : elem];
}
function _insert(concatenator) {
    return function (...elems) {
        const lastIdx = this.length - 1;
        return domEach(this, (el, i) => {
            if (!hasChildren(el))
                return;
            const domSrc = typeof elems[0] === 'function'
                ? elems[0].call(el, i, this._render(el.children))
                : elems;
            const dom = this._makeDomArray(domSrc, i < lastIdx);
            concatenator(dom, el.children, el);
        });
    };
}
/**
 * Modify an array in-place, removing some number of elements and adding new
 * elements directly following them.
 *
 * @private
 * @category Manipulation
 * @param array - Target array to splice.
 * @param spliceIdx - Index at which to begin changing the array.
 * @param spliceCount - Number of elements to remove from the array.
 * @param newElems - Elements to insert into the array.
 * @param parent - The parent of the node.
 * @returns The spliced array.
 */
function uniqueSplice(array, spliceIdx, spliceCount, newElems, parent) {
    var _a, _b;
    const spliceArgs = [
        spliceIdx,
        spliceCount,
        ...newElems,
    ];
    const prev = spliceIdx === 0 ? null : array[spliceIdx - 1];
    const next = spliceIdx + spliceCount >= array.length
        ? null
        : array[spliceIdx + spliceCount];
    /*
     * Before splicing in new elements, ensure they do not already appear in the
     * current array.
     */
    for (let idx = 0; idx < newElems.length; ++idx) {
        const node = newElems[idx];
        const oldParent = node.parent;
        if (oldParent) {
            const oldSiblings = oldParent.children;
            const prevIdx = oldSiblings.indexOf(node);
            if (prevIdx !== -1) {
                oldParent.children.splice(prevIdx, 1);
                if (parent === oldParent && spliceIdx > prevIdx) {
                    spliceArgs[0]--;
                }
            }
        }
        node.parent = parent;
        if (node.prev) {
            node.prev.next = (_a = node.next) !== null && _a !== void 0 ? _a : null;
        }
        if (node.next) {
            node.next.prev = (_b = node.prev) !== null && _b !== void 0 ? _b : null;
        }
        node.prev = idx === 0 ? prev : newElems[idx - 1];
        node.next = idx === newElems.length - 1 ? next : newElems[idx + 1];
    }
    if (prev) {
        prev.next = newElems[0];
    }
    if (next) {
        next.prev = newElems[newElems.length - 1];
    }
    return array.splice(...spliceArgs);
}
/**
 * Insert every element in the set of matched elements to the end of the target.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('<li class="plum">Plum</li>').appendTo('#fruits');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="apple">Apple</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //      <li class="plum">Plum</li>
 * //    </ul>
 * ```
 *
 * @param target - Element to append elements to.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/appendTo/}
 */
function appendTo(target) {
    const appendTarget = isCheerio(target) ? target : this._make(target);
    appendTarget.append(this);
    return this;
}
/**
 * Insert every element in the set of matched elements to the beginning of the
 * target.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('<li class="plum">Plum</li>').prependTo('#fruits');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="plum">Plum</li>
 * //      <li class="apple">Apple</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //    </ul>
 * ```
 *
 * @param target - Element to prepend elements to.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/prependTo/}
 */
function prependTo(target) {
    const prependTarget = isCheerio(target) ? target : this._make(target);
    prependTarget.prepend(this);
    return this;
}
/**
 * Inserts content as the _last_ child of each of the selected elements.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('ul').append('<li class="plum">Plum</li>');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="apple">Apple</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //      <li class="plum">Plum</li>
 * //    </ul>
 * ```
 *
 * @see {@link https://api.jquery.com/append/}
 */
const append = _insert((dom, children, parent) => {
    uniqueSplice(children, children.length, 0, dom, parent);
});
/**
 * Inserts content as the _first_ child of each of the selected elements.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('ul').prepend('<li class="plum">Plum</li>');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="plum">Plum</li>
 * //      <li class="apple">Apple</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //    </ul>
 * ```
 *
 * @see {@link https://api.jquery.com/prepend/}
 */
const prepend = _insert((dom, children, parent) => {
    uniqueSplice(children, 0, 0, dom, parent);
});
function _wrap(insert) {
    return function (wrapper) {
        const lastIdx = this.length - 1;
        const lastParent = this.parents().last();
        for (let i = 0; i < this.length; i++) {
            const el = this[i];
            const wrap = typeof wrapper === 'function'
                ? wrapper.call(el, i, el)
                : typeof wrapper === 'string' && !isHtml(wrapper)
                    ? lastParent.find(wrapper).clone()
                    : wrapper;
            const [wrapperDom] = this._makeDomArray(wrap, i < lastIdx);
            if (!wrapperDom || !hasChildren(wrapperDom))
                continue;
            let elInsertLocation = wrapperDom;
            /*
             * Find the deepest child. Only consider the first tag child of each node
             * (ignore text); stop if no children are found.
             */
            let j = 0;
            while (j < elInsertLocation.children.length) {
                const child = elInsertLocation.children[j];
                if (isTag(child)) {
                    elInsertLocation = child;
                    j = 0;
                }
                else {
                    j++;
                }
            }
            insert(el, elInsertLocation, [wrapperDom]);
        }
        return this;
    };
}
/**
 * The .wrap() function can take any string or object that could be passed to
 * the $() factory function to specify a DOM structure. This structure may be
 * nested several levels deep, but should contain only one inmost element. A
 * copy of this structure will be wrapped around each of the elements in the set
 * of matched elements. This method returns the original set of elements for
 * chaining purposes.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * const redFruit = $('<div class="red-fruit"></div>');
 * $('.apple').wrap(redFruit);
 *
 * //=> <ul id="fruits">
 * //     <div class="red-fruit">
 * //      <li class="apple">Apple</li>
 * //     </div>
 * //     <li class="orange">Orange</li>
 * //     <li class="plum">Plum</li>
 * //   </ul>
 *
 * const healthy = $('<div class="healthy"></div>');
 * $('li').wrap(healthy);
 *
 * //=> <ul id="fruits">
 * //     <div class="healthy">
 * //       <li class="apple">Apple</li>
 * //     </div>
 * //     <div class="healthy">
 * //       <li class="orange">Orange</li>
 * //     </div>
 * //     <div class="healthy">
 * //        <li class="plum">Plum</li>
 * //     </div>
 * //   </ul>
 * ```
 *
 * @param wrapper - The DOM structure to wrap around each element in the
 *   selection.
 * @see {@link https://api.jquery.com/wrap/}
 */
const wrap = _wrap((el, elInsertLocation, wrapperDom) => {
    const { parent } = el;
    if (!parent)
        return;
    const siblings = parent.children;
    const index = siblings.indexOf(el);
    update([el], elInsertLocation);
    /*
     * The previous operation removed the current element from the `siblings`
     * array, so the `dom` array can be inserted without removing any
     * additional elements.
     */
    uniqueSplice(siblings, index, 0, wrapperDom, parent);
});
/**
 * The .wrapInner() function can take any string or object that could be passed
 * to the $() factory function to specify a DOM structure. This structure may be
 * nested several levels deep, but should contain only one inmost element. The
 * structure will be wrapped around the content of each of the elements in the
 * set of matched elements.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * const redFruit = $('<div class="red-fruit"></div>');
 * $('.apple').wrapInner(redFruit);
 *
 * //=> <ul id="fruits">
 * //     <li class="apple">
 * //       <div class="red-fruit">Apple</div>
 * //     </li>
 * //     <li class="orange">Orange</li>
 * //     <li class="pear">Pear</li>
 * //   </ul>
 *
 * const healthy = $('<div class="healthy"></div>');
 * $('li').wrapInner(healthy);
 *
 * //=> <ul id="fruits">
 * //     <li class="apple">
 * //       <div class="healthy">Apple</div>
 * //     </li>
 * //     <li class="orange">
 * //       <div class="healthy">Orange</div>
 * //     </li>
 * //     <li class="pear">
 * //       <div class="healthy">Pear</div>
 * //     </li>
 * //   </ul>
 * ```
 *
 * @param wrapper - The DOM structure to wrap around the content of each element
 *   in the selection.
 * @returns The instance itself, for chaining.
 * @see {@link https://api.jquery.com/wrapInner/}
 */
const wrapInner = _wrap((el, elInsertLocation, wrapperDom) => {
    if (!hasChildren(el))
        return;
    update(el.children, elInsertLocation);
    update(wrapperDom, el);
});
/**
 * The .unwrap() function, removes the parents of the set of matched elements
 * from the DOM, leaving the matched elements in their place.
 *
 * @category Manipulation
 * @example <caption>without selector</caption>
 *
 * ```js
 * const $ = cheerio.load(
 *   '<div id=test>\n  <div><p>Hello</p></div>\n  <div><p>World</p></div>\n</div>',
 * );
 * $('#test p').unwrap();
 *
 * //=> <div id=test>
 * //     <p>Hello</p>
 * //     <p>World</p>
 * //   </div>
 * ```
 *
 * @example <caption>with selector</caption>
 *
 * ```js
 * const $ = cheerio.load(
 *   '<div id=test>\n  <p>Hello</p>\n  <b><p>World</p></b>\n</div>',
 * );
 * $('#test p').unwrap('b');
 *
 * //=> <div id=test>
 * //     <p>Hello</p>
 * //     <p>World</p>
 * //   </div>
 * ```
 *
 * @param selector - A selector to check the parent element against. If an
 *   element's parent does not match the selector, the element won't be
 *   unwrapped.
 * @returns The instance itself, for chaining.
 * @see {@link https://api.jquery.com/unwrap/}
 */
function unwrap(selector) {
    this.parent(selector)
        .not('body')
        .each((_, el) => {
        this._make(el).replaceWith(el.children);
    });
    return this;
}
/**
 * The .wrapAll() function can take any string or object that could be passed to
 * the $() function to specify a DOM structure. This structure may be nested
 * several levels deep, but should contain only one inmost element. The
 * structure will be wrapped around all of the elements in the set of matched
 * elements, as a single group.
 *
 * @category Manipulation
 * @example <caption>With markup passed to `wrapAll`</caption>
 *
 * ```js
 * const $ = cheerio.load(
 *   '<div class="container"><div class="inner">First</div><div class="inner">Second</div></div>',
 * );
 * $('.inner').wrapAll("<div class='new'></div>");
 *
 * //=> <div class="container">
 * //     <div class='new'>
 * //       <div class="inner">First</div>
 * //       <div class="inner">Second</div>
 * //     </div>
 * //   </div>
 * ```
 *
 * @example <caption>With an existing cheerio instance</caption>
 *
 * ```js
 * const $ = cheerio.load(
 *   '<span>Span 1</span><strong>Strong</strong><span>Span 2</span>',
 * );
 * const wrap = $('<div><p><em><b></b></em></p></div>');
 * $('span').wrapAll(wrap);
 *
 * //=> <div>
 * //     <p>
 * //       <em>
 * //         <b>
 * //           <span>Span 1</span>
 * //           <span>Span 2</span>
 * //         </b>
 * //       </em>
 * //     </p>
 * //   </div>
 * //   <strong>Strong</strong>
 * ```
 *
 * @param wrapper - The DOM structure to wrap around all matched elements in the
 *   selection.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/wrapAll/}
 */
function wrapAll(wrapper) {
    const el = this[0];
    if (el) {
        const wrap = this._make(typeof wrapper === 'function' ? wrapper.call(el, 0, el) : wrapper).insertBefore(el);
        // If html is given as wrapper, wrap may contain text elements
        let elInsertLocation;
        for (let i = 0; i < wrap.length; i++) {
            if (wrap[i].type === Tag) {
                elInsertLocation = wrap[i];
            }
        }
        let j = 0;
        /*
         * Find the deepest child. Only consider the first tag child of each node
         * (ignore text); stop if no children are found.
         */
        while (elInsertLocation && j < elInsertLocation.children.length) {
            const child = elInsertLocation.children[j];
            if (child.type === Tag) {
                elInsertLocation = child;
                j = 0;
            }
            else {
                j++;
            }
        }
        if (elInsertLocation)
            this._make(elInsertLocation).append(this);
    }
    return this;
}
/**
 * Insert content next to each element in the set of matched elements.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('.apple').after('<li class="plum">Plum</li>');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="apple">Apple</li>
 * //      <li class="plum">Plum</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //    </ul>
 * ```
 *
 * @param elems - HTML string, DOM element, array of DOM elements or Cheerio to
 *   insert after each element in the set of matched elements.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/after/}
 */
function after(...elems) {
    const lastIdx = this.length - 1;
    return domEach(this, (el, i) => {
        if (!hasChildren(el) || !el.parent) {
            return;
        }
        const siblings = el.parent.children;
        const index = siblings.indexOf(el);
        // If not found, move on
        /* istanbul ignore next */
        if (index === -1)
            return;
        const domSrc = typeof elems[0] === 'function'
            ? elems[0].call(el, i, this._render(el.children))
            : elems;
        const dom = this._makeDomArray(domSrc, i < lastIdx);
        // Add element after `this` element
        uniqueSplice(siblings, index + 1, 0, dom, el.parent);
    });
}
/**
 * Insert every element in the set of matched elements after the target.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('<li class="plum">Plum</li>').insertAfter('.apple');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="apple">Apple</li>
 * //      <li class="plum">Plum</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //    </ul>
 * ```
 *
 * @param target - Element to insert elements after.
 * @returns The set of newly inserted elements.
 * @see {@link https://api.jquery.com/insertAfter/}
 */
function insertAfter(target) {
    if (typeof target === 'string') {
        target = this._make(target);
    }
    this.remove();
    const clones = [];
    for (const el of this._makeDomArray(target)) {
        const clonedSelf = this.clone().toArray();
        const { parent } = el;
        if (!parent) {
            continue;
        }
        const siblings = parent.children;
        const index = siblings.indexOf(el);
        // If not found, move on
        /* istanbul ignore next */
        if (index === -1)
            continue;
        // Add cloned `this` element(s) after target element
        uniqueSplice(siblings, index + 1, 0, clonedSelf, parent);
        clones.push(...clonedSelf);
    }
    return this._make(clones);
}
/**
 * Insert content previous to each element in the set of matched elements.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('.apple').before('<li class="plum">Plum</li>');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="plum">Plum</li>
 * //      <li class="apple">Apple</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //    </ul>
 * ```
 *
 * @param elems - HTML string, DOM element, array of DOM elements or Cheerio to
 *   insert before each element in the set of matched elements.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/before/}
 */
function before(...elems) {
    const lastIdx = this.length - 1;
    return domEach(this, (el, i) => {
        if (!hasChildren(el) || !el.parent) {
            return;
        }
        const siblings = el.parent.children;
        const index = siblings.indexOf(el);
        // If not found, move on
        /* istanbul ignore next */
        if (index === -1)
            return;
        const domSrc = typeof elems[0] === 'function'
            ? elems[0].call(el, i, this._render(el.children))
            : elems;
        const dom = this._makeDomArray(domSrc, i < lastIdx);
        // Add element before `el` element
        uniqueSplice(siblings, index, 0, dom, el.parent);
    });
}
/**
 * Insert every element in the set of matched elements before the target.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('<li class="plum">Plum</li>').insertBefore('.apple');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="plum">Plum</li>
 * //      <li class="apple">Apple</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //    </ul>
 * ```
 *
 * @param target - Element to insert elements before.
 * @returns The set of newly inserted elements.
 * @see {@link https://api.jquery.com/insertBefore/}
 */
function insertBefore(target) {
    const targetArr = this._make(target);
    this.remove();
    const clones = [];
    domEach(targetArr, (el) => {
        const clonedSelf = this.clone().toArray();
        const { parent } = el;
        if (!parent) {
            return;
        }
        const siblings = parent.children;
        const index = siblings.indexOf(el);
        // If not found, move on
        /* istanbul ignore next */
        if (index === -1)
            return;
        // Add cloned `this` element(s) after target element
        uniqueSplice(siblings, index, 0, clonedSelf, parent);
        clones.push(...clonedSelf);
    });
    return this._make(clones);
}
/**
 * Removes the set of matched elements from the DOM and all their children.
 * `selector` filters the set of matched elements to be removed.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('.pear').remove();
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="apple">Apple</li>
 * //      <li class="orange">Orange</li>
 * //    </ul>
 * ```
 *
 * @param selector - Optional selector for elements to remove.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/remove/}
 */
function remove(selector) {
    // Filter if we have selector
    const elems = selector ? this.filter(selector) : this;
    domEach(elems, (el) => {
        removeElement(el);
        el.prev = el.next = el.parent = null;
    });
    return this;
}
/**
 * Replaces matched elements with `content`.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * const plum = $('<li class="plum">Plum</li>');
 * $('.pear').replaceWith(plum);
 * $.html();
 * //=> <ul id="fruits">
 * //     <li class="apple">Apple</li>
 * //     <li class="orange">Orange</li>
 * //     <li class="plum">Plum</li>
 * //   </ul>
 * ```
 *
 * @param content - Replacement for matched elements.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/replaceWith/}
 */
function replaceWith(content) {
    return domEach(this, (el, i) => {
        const { parent } = el;
        if (!parent) {
            return;
        }
        const siblings = parent.children;
        const cont = typeof content === 'function' ? content.call(el, i, el) : content;
        const dom = this._makeDomArray(cont);
        /*
         * In the case that `dom` contains nodes that already exist in other
         * structures, ensure those nodes are properly removed.
         */
        update(dom, null);
        const index = siblings.indexOf(el);
        // Completely remove old element
        uniqueSplice(siblings, index, 1, dom, parent);
        if (!dom.includes(el)) {
            el.parent = el.prev = el.next = null;
        }
    });
}
/**
 * Removes all children from each item in the selection. Text nodes and comment
 * nodes are left as is.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('ul').empty();
 * $.html();
 * //=>  <ul id="fruits"></ul>
 * ```
 *
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/empty/}
 */
function empty() {
    return domEach(this, (el) => {
        if (!hasChildren(el))
            return;
        for (const child of el.children) {
            child.next = child.prev = child.parent = null;
        }
        el.children.length = 0;
    });
}
function html(str) {
    if (str === undefined) {
        const el = this[0];
        if (!el || !hasChildren(el))
            return null;
        return this._render(el.children);
    }
    return domEach(this, (el) => {
        if (!hasChildren(el))
            return;
        for (const child of el.children) {
            child.next = child.prev = child.parent = null;
        }
        const content = isCheerio(str)
            ? str.toArray()
            : this._parse(`${str}`, this.options, false, el).children;
        update(content, el);
    });
}
/**
 * Turns the collection to a string. Alias for `.html()`.
 *
 * @category Manipulation
 * @returns The rendered document.
 */
function toString() {
    return this._render(this);
}
function text(str) {
    // If `str` is undefined, act as a "getter"
    if (str === undefined) {
        return text$1(this);
    }
    if (typeof str === 'function') {
        // Function support
        return domEach(this, (el, i) => this._make(el).text(str.call(el, i, text$1([el]))));
    }
    // Append text node to each selected elements
    return domEach(this, (el) => {
        if (!hasChildren(el))
            return;
        for (const child of el.children) {
            child.next = child.prev = child.parent = null;
        }
        const textNode = new Text(`${str}`);
        update(textNode, el);
    });
}
/**
 * Clone the cheerio object.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * const moreFruit = $('#fruits').clone();
 * ```
 *
 * @returns The cloned object.
 * @see {@link https://api.jquery.com/clone/}
 */
function clone() {
    const clone = Array.prototype.map.call(this.get(), (el) => cloneNode(el, true));
    // Add a root node around the cloned nodes
    const root = new Document(clone);
    for (const node of clone) {
        node.parent = root;
    }
    return this._make(clone);
}

var Manipulation = /*#__PURE__*/Object.freeze({
    __proto__: null,
    _makeDomArray: _makeDomArray,
    appendTo: appendTo,
    prependTo: prependTo,
    append: append,
    prepend: prepend,
    wrap: wrap,
    wrapInner: wrapInner,
    unwrap: unwrap,
    wrapAll: wrapAll,
    after: after,
    insertAfter: insertAfter,
    before: before,
    insertBefore: insertBefore,
    remove: remove,
    replaceWith: replaceWith,
    empty: empty,
    html: html,
    toString: toString,
    text: text,
    clone: clone
});

/**
 * Set multiple CSS properties for every matched element.
 *
 * @category CSS
 * @param prop - The names of the properties.
 * @param val - The new values.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/css/}
 */
function css(prop, val) {
    if ((prop != null && val != null) ||
        // When `prop` is a "plain" object
        (typeof prop === 'object' && !Array.isArray(prop))) {
        return domEach(this, (el, i) => {
            if (isTag(el)) {
                // `prop` can't be an array here anymore.
                setCss(el, prop, val, i);
            }
        });
    }
    if (this.length === 0) {
        return undefined;
    }
    return getCss(this[0], prop);
}
/**
 * Set styles of all elements.
 *
 * @private
 * @param el - Element to set style of.
 * @param prop - Name of property.
 * @param value - Value to set property to.
 * @param idx - Optional index within the selection.
 */
function setCss(el, prop, value, idx) {
    if (typeof prop === 'string') {
        const styles = getCss(el);
        const val = typeof value === 'function' ? value.call(el, idx, styles[prop]) : value;
        if (val === '') {
            delete styles[prop];
        }
        else if (val != null) {
            styles[prop] = val;
        }
        el.attribs['style'] = stringify(styles);
    }
    else if (typeof prop === 'object') {
        const keys = Object.keys(prop);
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            setCss(el, k, prop[k], i);
        }
    }
}
function getCss(el, prop) {
    if (!el || !isTag(el))
        return;
    const styles = parse$2(el.attribs['style']);
    if (typeof prop === 'string') {
        return styles[prop];
    }
    if (Array.isArray(prop)) {
        const newStyles = {};
        for (const item of prop) {
            if (styles[item] != null) {
                newStyles[item] = styles[item];
            }
        }
        return newStyles;
    }
    return styles;
}
/**
 * Stringify `obj` to styles.
 *
 * @private
 * @category CSS
 * @param obj - Object to stringify.
 * @returns The serialized styles.
 */
function stringify(obj) {
    return Object.keys(obj).reduce((str, prop) => `${str}${str ? ' ' : ''}${prop}: ${obj[prop]};`, '');
}
/**
 * Parse `styles`.
 *
 * @private
 * @category CSS
 * @param styles - Styles to be parsed.
 * @returns The parsed styles.
 */
function parse$2(styles) {
    styles = (styles || '').trim();
    if (!styles)
        return {};
    const obj = {};
    let key;
    for (const str of styles.split(';')) {
        const n = str.indexOf(':');
        // If there is no :, or if it is the first/last character, add to the previous item's value
        if (n < 1 || n === str.length - 1) {
            const trimmed = str.trimEnd();
            if (trimmed.length > 0 && key !== undefined) {
                obj[key] += `;${trimmed}`;
            }
        }
        else {
            key = str.slice(0, n).trim();
            obj[key] = str.slice(n + 1).trim();
        }
    }
    return obj;
}

var Css = /*#__PURE__*/Object.freeze({
    __proto__: null,
    css: css
});

/*
 * https://github.com/jquery/jquery/blob/2.1.3/src/manipulation/var/rcheckableType.js
 * https://github.com/jquery/jquery/blob/2.1.3/src/serialize.js
 */
const submittableSelector = 'input,select,textarea,keygen';
const r20 = /%20/g;
const rCRLF = /\r?\n/g;
/**
 * Encode a set of form elements as a string for submission.
 *
 * @category Forms
 * @example
 *
 * ```js
 * $('<form><input name="foo" value="bar" /></form>').serialize();
 * //=> 'foo=bar'
 * ```
 *
 * @returns The serialized form.
 * @see {@link https://api.jquery.com/serialize/}
 */
function serialize() {
    // Convert form elements into name/value objects
    const arr = this.serializeArray();
    // Serialize each element into a key/value string
    const retArr = arr.map((data) => `${encodeURIComponent(data.name)}=${encodeURIComponent(data.value)}`);
    // Return the resulting serialization
    return retArr.join('&').replace(r20, '+');
}
/**
 * Encode a set of form elements as an array of names and values.
 *
 * @category Forms
 * @example
 *
 * ```js
 * $('<form><input name="foo" value="bar" /></form>').serializeArray();
 * //=> [ { name: 'foo', value: 'bar' } ]
 * ```
 *
 * @returns The serialized form.
 * @see {@link https://api.jquery.com/serializeArray/}
 */
function serializeArray() {
    // Resolve all form elements from either forms or collections of form elements
    return this.map((_, elem) => {
        const $elem = this._make(elem);
        if (isTag(elem) && elem.name === 'form') {
            return $elem.find(submittableSelector).toArray();
        }
        return $elem.filter(submittableSelector).toArray();
    })
        .filter(
    // Verify elements have a name (`attr.name`) and are not disabled (`:enabled`)
    '[name!=""]:enabled' +
        // And cannot be clicked (`[type=submit]`) or are used in `x-www-form-urlencoded` (`[type=file]`)
        ':not(:submit, :button, :image, :reset, :file)' +
        // And are either checked/don't have a checkable state
        ':matches([checked], :not(:checkbox, :radio))')
        .map((_, elem) => {
        var _a;
        const $elem = this._make(elem);
        const name = $elem.attr('name'); // We have filtered for elements with a name before.
        // If there is no value set (e.g. `undefined`, `null`), then default value to empty
        const value = (_a = $elem.val()) !== null && _a !== void 0 ? _a : '';
        // If we have an array of values (e.g. `<select multiple>`), return an array of key/value pairs
        if (Array.isArray(value)) {
            return value.map((val) => 
            /*
             * We trim replace any line endings (e.g. `\r` or `\r\n` with `\r\n`) to guarantee consistency across platforms
             * These can occur inside of `<textarea>'s`
             */
            ({ name, value: val.replace(rCRLF, '\r\n') }));
        }
        // Otherwise (e.g. `<input type="text">`, return only one key/value pair
        return { name, value: value.replace(rCRLF, '\r\n') };
    })
        .toArray();
}

var Forms = /*#__PURE__*/Object.freeze({
    __proto__: null,
    serialize: serialize,
    serializeArray: serializeArray
});

function getExtractDescr(descr) {
    var _a;
    if (typeof descr === 'string') {
        return { selector: descr, value: 'textContent' };
    }
    return {
        selector: descr.selector,
        value: (_a = descr.value) !== null && _a !== void 0 ? _a : 'textContent',
    };
}
/**
 * Extract multiple values from a document, and store them in an object.
 *
 * @param map - An object containing key-value pairs. The keys are the names of
 *   the properties to be created on the object, and the values are the
 *   selectors to be used to extract the values.
 * @returns An object containing the extracted values.
 */
function extract(map) {
    const ret = {};
    for (const key in map) {
        const descr = map[key];
        const isArray = Array.isArray(descr);
        const { selector, value } = getExtractDescr(isArray ? descr[0] : descr);
        const fn = typeof value === 'function'
            ? value
            : typeof value === 'string'
                ? (el) => this._make(el).prop(value)
                : (el) => this._make(el).extract(value);
        if (isArray) {
            ret[key] = this._findBySelector(selector, Number.POSITIVE_INFINITY)
                .map((_, el) => fn(el, key, ret))
                .get();
        }
        else {
            const $ = this._findBySelector(selector, 1);
            ret[key] = $.length > 0 ? fn($[0], key, ret) : undefined;
        }
    }
    return ret;
}

var Extract = /*#__PURE__*/Object.freeze({
    __proto__: null,
    extract: extract
});

/**
 * The cheerio class is the central class of the library. It wraps a set of
 * elements and provides an API for traversing, modifying, and interacting with
 * the set.
 *
 * Loading a document will return the Cheerio class bound to the root element of
 * the document. The class will be instantiated when querying the document (when
 * calling `$('selector')`).
 *
 * @example This is the HTML markup we will be using in all of the API examples:
 *
 * ```html
 * <ul id="fruits">
 *   <li class="apple">Apple</li>
 *   <li class="orange">Orange</li>
 *   <li class="pear">Pear</li>
 * </ul>
 * ```
 */
class Cheerio {
    /**
     * Instance of cheerio. Methods are specified in the modules. Usage of this
     * constructor is not recommended. Please use `$.load` instead.
     *
     * @private
     * @param elements - The new selection.
     * @param root - Sets the root node.
     * @param options - Options for the instance.
     */
    constructor(elements, root, options) {
        this.length = 0;
        this.options = options;
        this._root = root;
        if (elements) {
            for (let idx = 0; idx < elements.length; idx++) {
                this[idx] = elements[idx];
            }
            this.length = elements.length;
        }
    }
}
/** Set a signature of the object. */
Cheerio.prototype.cheerio = '[cheerio object]';
/*
 * Make cheerio an array-like object
 */
Cheerio.prototype.splice = Array.prototype.splice;
// Support for (const element of $(...)) iteration:
Cheerio.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
// Plug in the API
Object.assign(Cheerio.prototype, Attributes, Traversing, Manipulation, Css, Forms, Extract);

function getLoad(parse, render) {
    /**
     * Create a querying function, bound to a document created from the provided
     * markup.
     *
     * Note that similar to web browser contexts, this operation may introduce
     * `<html>`, `<head>`, and `<body>` elements; set `isDocument` to `false` to
     * switch to fragment mode and disable this.
     *
     * @param content - Markup to be loaded.
     * @param options - Options for the created instance.
     * @param isDocument - Allows parser to be switched to fragment mode.
     * @returns The loaded document.
     * @see {@link https://cheerio.js.org/docs/basics/loading#load} for additional usage information.
     */
    return function load(content, options, isDocument = true) {
        if (content == null) {
            throw new Error('cheerio.load() expects a string');
        }
        const internalOpts = flattenOptions(options);
        const initialRoot = parse(content, internalOpts, isDocument, null);
        /**
         * Create an extended class here, so that extensions only live on one
         * instance.
         */
        class LoadedCheerio extends Cheerio {
            _make(selector, context) {
                const cheerio = initialize(selector, context);
                cheerio.prevObject = this;
                return cheerio;
            }
            _parse(content, options, isDocument, context) {
                return parse(content, options, isDocument, context);
            }
            _render(dom) {
                return render(dom, this.options);
            }
        }
        function initialize(selector, context, root = initialRoot, opts) {
            // $($)
            if (selector && isCheerio(selector))
                return selector;
            const options = flattenOptions(opts, internalOpts);
            const r = typeof root === 'string'
                ? [parse(root, options, false, null)]
                : 'length' in root
                    ? root
                    : [root];
            const rootInstance = isCheerio(r)
                ? r
                : new LoadedCheerio(r, null, options);
            // Add a cyclic reference, so that calling methods on `_root` never fails.
            rootInstance._root = rootInstance;
            // $(), $(null), $(undefined), $(false)
            if (!selector) {
                return new LoadedCheerio(undefined, rootInstance, options);
            }
            const elements = typeof selector === 'string' && isHtml(selector)
                ? // $(<html>)
                    parse(selector, options, false, null).children
                : isNode(selector)
                    ? // $(dom)
                        [selector]
                    : Array.isArray(selector)
                        ? // $([dom])
                            selector
                        : undefined;
            const instance = new LoadedCheerio(elements, rootInstance, options);
            if (elements) {
                return instance;
            }
            if (typeof selector !== 'string') {
                throw new TypeError('Unexpected type of selector');
            }
            // We know that our selector is a string now.
            let search = selector;
            const searchContext = context
                ? // If we don't have a context, maybe we have a root, from loading
                    typeof context === 'string'
                        ? isHtml(context)
                            ? // $('li', '<ul>...</ul>')
                                new LoadedCheerio([parse(context, options, false, null)], rootInstance, options)
                            : // $('li', 'ul')
                                ((search = `${context} ${search}`), rootInstance)
                        : isCheerio(context)
                            ? // $('li', $)
                                context
                            : // $('li', node), $('li', [nodes])
                                new LoadedCheerio(Array.isArray(context) ? context : [context], rootInstance, options)
                : rootInstance;
            // If we still don't have a context, return
            if (!searchContext)
                return instance;
            /*
             * #id, .class, tag
             */
            return searchContext.find(search);
        }
        // Add in static methods & properties
        Object.assign(initialize, staticMethods, {
            load,
            // `_root` and `_options` are used in static methods.
            _root: initialRoot,
            _options: internalOpts,
            // Add `fn` for plugins
            fn: LoadedCheerio.prototype,
            // Add the prototype here to maintain `instanceof` behavior.
            prototype: LoadedCheerio.prototype,
        });
        return initialize;
    };
}
function isNode(obj) {
    return (
    // @ts-expect-error: TS doesn't know about the `name` property.
    !!obj.name ||
        // @ts-expect-error: TS doesn't know about the `type` property.
        obj.type === Root ||
        // @ts-expect-error: TS doesn't know about the `type` property.
        obj.type === Text$1 ||
        // @ts-expect-error: TS doesn't know about the `type` property.
        obj.type === Comment$1);
}

const UNDEFINED_CODE_POINTS = new Set([
    65534, 65535, 131070, 131071, 196606, 196607, 262142, 262143, 327678, 327679, 393214,
    393215, 458750, 458751, 524286, 524287, 589822, 589823, 655358, 655359, 720894,
    720895, 786430, 786431, 851966, 851967, 917502, 917503, 983038, 983039, 1048574,
    1048575, 1114110, 1114111,
]);
const REPLACEMENT_CHARACTER = '\uFFFD';
var CODE_POINTS;
(function (CODE_POINTS) {
    CODE_POINTS[CODE_POINTS["EOF"] = -1] = "EOF";
    CODE_POINTS[CODE_POINTS["NULL"] = 0] = "NULL";
    CODE_POINTS[CODE_POINTS["TABULATION"] = 9] = "TABULATION";
    CODE_POINTS[CODE_POINTS["CARRIAGE_RETURN"] = 13] = "CARRIAGE_RETURN";
    CODE_POINTS[CODE_POINTS["LINE_FEED"] = 10] = "LINE_FEED";
    CODE_POINTS[CODE_POINTS["FORM_FEED"] = 12] = "FORM_FEED";
    CODE_POINTS[CODE_POINTS["SPACE"] = 32] = "SPACE";
    CODE_POINTS[CODE_POINTS["EXCLAMATION_MARK"] = 33] = "EXCLAMATION_MARK";
    CODE_POINTS[CODE_POINTS["QUOTATION_MARK"] = 34] = "QUOTATION_MARK";
    CODE_POINTS[CODE_POINTS["AMPERSAND"] = 38] = "AMPERSAND";
    CODE_POINTS[CODE_POINTS["APOSTROPHE"] = 39] = "APOSTROPHE";
    CODE_POINTS[CODE_POINTS["HYPHEN_MINUS"] = 45] = "HYPHEN_MINUS";
    CODE_POINTS[CODE_POINTS["SOLIDUS"] = 47] = "SOLIDUS";
    CODE_POINTS[CODE_POINTS["DIGIT_0"] = 48] = "DIGIT_0";
    CODE_POINTS[CODE_POINTS["DIGIT_9"] = 57] = "DIGIT_9";
    CODE_POINTS[CODE_POINTS["SEMICOLON"] = 59] = "SEMICOLON";
    CODE_POINTS[CODE_POINTS["LESS_THAN_SIGN"] = 60] = "LESS_THAN_SIGN";
    CODE_POINTS[CODE_POINTS["EQUALS_SIGN"] = 61] = "EQUALS_SIGN";
    CODE_POINTS[CODE_POINTS["GREATER_THAN_SIGN"] = 62] = "GREATER_THAN_SIGN";
    CODE_POINTS[CODE_POINTS["QUESTION_MARK"] = 63] = "QUESTION_MARK";
    CODE_POINTS[CODE_POINTS["LATIN_CAPITAL_A"] = 65] = "LATIN_CAPITAL_A";
    CODE_POINTS[CODE_POINTS["LATIN_CAPITAL_Z"] = 90] = "LATIN_CAPITAL_Z";
    CODE_POINTS[CODE_POINTS["RIGHT_SQUARE_BRACKET"] = 93] = "RIGHT_SQUARE_BRACKET";
    CODE_POINTS[CODE_POINTS["GRAVE_ACCENT"] = 96] = "GRAVE_ACCENT";
    CODE_POINTS[CODE_POINTS["LATIN_SMALL_A"] = 97] = "LATIN_SMALL_A";
    CODE_POINTS[CODE_POINTS["LATIN_SMALL_Z"] = 122] = "LATIN_SMALL_Z";
})(CODE_POINTS || (CODE_POINTS = {}));
const SEQUENCES = {
    DASH_DASH: '--',
    CDATA_START: '[CDATA[',
    DOCTYPE: 'doctype',
    SCRIPT: 'script',
    PUBLIC: 'public',
    SYSTEM: 'system',
};
//Surrogates
function isSurrogate(cp) {
    return cp >= 55296 && cp <= 57343;
}
function isSurrogatePair(cp) {
    return cp >= 56320 && cp <= 57343;
}
function getSurrogatePairCodePoint(cp1, cp2) {
    return (cp1 - 55296) * 1024 + 9216 + cp2;
}
//NOTE: excluding NULL and ASCII whitespace
function isControlCodePoint(cp) {
    return ((cp !== 0x20 && cp !== 0x0a && cp !== 0x0d && cp !== 0x09 && cp !== 0x0c && cp >= 0x01 && cp <= 0x1f) ||
        (cp >= 0x7f && cp <= 0x9f));
}
function isUndefinedCodePoint(cp) {
    return (cp >= 64976 && cp <= 65007) || UNDEFINED_CODE_POINTS.has(cp);
}

var ERR;
(function (ERR) {
    ERR["controlCharacterInInputStream"] = "control-character-in-input-stream";
    ERR["noncharacterInInputStream"] = "noncharacter-in-input-stream";
    ERR["surrogateInInputStream"] = "surrogate-in-input-stream";
    ERR["nonVoidHtmlElementStartTagWithTrailingSolidus"] = "non-void-html-element-start-tag-with-trailing-solidus";
    ERR["endTagWithAttributes"] = "end-tag-with-attributes";
    ERR["endTagWithTrailingSolidus"] = "end-tag-with-trailing-solidus";
    ERR["unexpectedSolidusInTag"] = "unexpected-solidus-in-tag";
    ERR["unexpectedNullCharacter"] = "unexpected-null-character";
    ERR["unexpectedQuestionMarkInsteadOfTagName"] = "unexpected-question-mark-instead-of-tag-name";
    ERR["invalidFirstCharacterOfTagName"] = "invalid-first-character-of-tag-name";
    ERR["unexpectedEqualsSignBeforeAttributeName"] = "unexpected-equals-sign-before-attribute-name";
    ERR["missingEndTagName"] = "missing-end-tag-name";
    ERR["unexpectedCharacterInAttributeName"] = "unexpected-character-in-attribute-name";
    ERR["unknownNamedCharacterReference"] = "unknown-named-character-reference";
    ERR["missingSemicolonAfterCharacterReference"] = "missing-semicolon-after-character-reference";
    ERR["unexpectedCharacterAfterDoctypeSystemIdentifier"] = "unexpected-character-after-doctype-system-identifier";
    ERR["unexpectedCharacterInUnquotedAttributeValue"] = "unexpected-character-in-unquoted-attribute-value";
    ERR["eofBeforeTagName"] = "eof-before-tag-name";
    ERR["eofInTag"] = "eof-in-tag";
    ERR["missingAttributeValue"] = "missing-attribute-value";
    ERR["missingWhitespaceBetweenAttributes"] = "missing-whitespace-between-attributes";
    ERR["missingWhitespaceAfterDoctypePublicKeyword"] = "missing-whitespace-after-doctype-public-keyword";
    ERR["missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers"] = "missing-whitespace-between-doctype-public-and-system-identifiers";
    ERR["missingWhitespaceAfterDoctypeSystemKeyword"] = "missing-whitespace-after-doctype-system-keyword";
    ERR["missingQuoteBeforeDoctypePublicIdentifier"] = "missing-quote-before-doctype-public-identifier";
    ERR["missingQuoteBeforeDoctypeSystemIdentifier"] = "missing-quote-before-doctype-system-identifier";
    ERR["missingDoctypePublicIdentifier"] = "missing-doctype-public-identifier";
    ERR["missingDoctypeSystemIdentifier"] = "missing-doctype-system-identifier";
    ERR["abruptDoctypePublicIdentifier"] = "abrupt-doctype-public-identifier";
    ERR["abruptDoctypeSystemIdentifier"] = "abrupt-doctype-system-identifier";
    ERR["cdataInHtmlContent"] = "cdata-in-html-content";
    ERR["incorrectlyOpenedComment"] = "incorrectly-opened-comment";
    ERR["eofInScriptHtmlCommentLikeText"] = "eof-in-script-html-comment-like-text";
    ERR["eofInDoctype"] = "eof-in-doctype";
    ERR["nestedComment"] = "nested-comment";
    ERR["abruptClosingOfEmptyComment"] = "abrupt-closing-of-empty-comment";
    ERR["eofInComment"] = "eof-in-comment";
    ERR["incorrectlyClosedComment"] = "incorrectly-closed-comment";
    ERR["eofInCdata"] = "eof-in-cdata";
    ERR["absenceOfDigitsInNumericCharacterReference"] = "absence-of-digits-in-numeric-character-reference";
    ERR["nullCharacterReference"] = "null-character-reference";
    ERR["surrogateCharacterReference"] = "surrogate-character-reference";
    ERR["characterReferenceOutsideUnicodeRange"] = "character-reference-outside-unicode-range";
    ERR["controlCharacterReference"] = "control-character-reference";
    ERR["noncharacterCharacterReference"] = "noncharacter-character-reference";
    ERR["missingWhitespaceBeforeDoctypeName"] = "missing-whitespace-before-doctype-name";
    ERR["missingDoctypeName"] = "missing-doctype-name";
    ERR["invalidCharacterSequenceAfterDoctypeName"] = "invalid-character-sequence-after-doctype-name";
    ERR["duplicateAttribute"] = "duplicate-attribute";
    ERR["nonConformingDoctype"] = "non-conforming-doctype";
    ERR["missingDoctype"] = "missing-doctype";
    ERR["misplacedDoctype"] = "misplaced-doctype";
    ERR["endTagWithoutMatchingOpenElement"] = "end-tag-without-matching-open-element";
    ERR["closingOfElementWithOpenChildElements"] = "closing-of-element-with-open-child-elements";
    ERR["disallowedContentInNoscriptInHead"] = "disallowed-content-in-noscript-in-head";
    ERR["openElementsLeftAfterEof"] = "open-elements-left-after-eof";
    ERR["abandonedHeadElementChild"] = "abandoned-head-element-child";
    ERR["misplacedStartTagForHeadElement"] = "misplaced-start-tag-for-head-element";
    ERR["nestedNoscriptInHead"] = "nested-noscript-in-head";
    ERR["eofInElementThatCanContainOnlyText"] = "eof-in-element-that-can-contain-only-text";
})(ERR || (ERR = {}));

//Const
const DEFAULT_BUFFER_WATERLINE = 1 << 16;
//Preprocessor
//NOTE: HTML input preprocessing
//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/parsing.html#preprocessing-the-input-stream)
class Preprocessor {
    constructor(handler) {
        this.handler = handler;
        this.html = '';
        this.pos = -1;
        // NOTE: Initial `lastGapPos` is -2, to ensure `col` on initialisation is 0
        this.lastGapPos = -2;
        this.gapStack = [];
        this.skipNextNewLine = false;
        this.lastChunkWritten = false;
        this.endOfChunkHit = false;
        this.bufferWaterline = DEFAULT_BUFFER_WATERLINE;
        this.isEol = false;
        this.lineStartPos = 0;
        this.droppedBufferSize = 0;
        this.line = 1;
        //NOTE: avoid reporting errors twice on advance/retreat
        this.lastErrOffset = -1;
    }
    /** The column on the current line. If we just saw a gap (eg. a surrogate pair), return the index before. */
    get col() {
        return this.pos - this.lineStartPos + Number(this.lastGapPos !== this.pos);
    }
    get offset() {
        return this.droppedBufferSize + this.pos;
    }
    getError(code, cpOffset) {
        const { line, col, offset } = this;
        const startCol = col + cpOffset;
        const startOffset = offset + cpOffset;
        return {
            code,
            startLine: line,
            endLine: line,
            startCol,
            endCol: startCol,
            startOffset,
            endOffset: startOffset,
        };
    }
    _err(code) {
        if (this.handler.onParseError && this.lastErrOffset !== this.offset) {
            this.lastErrOffset = this.offset;
            this.handler.onParseError(this.getError(code, 0));
        }
    }
    _addGap() {
        this.gapStack.push(this.lastGapPos);
        this.lastGapPos = this.pos;
    }
    _processSurrogate(cp) {
        //NOTE: try to peek a surrogate pair
        if (this.pos !== this.html.length - 1) {
            const nextCp = this.html.charCodeAt(this.pos + 1);
            if (isSurrogatePair(nextCp)) {
                //NOTE: we have a surrogate pair. Peek pair character and recalculate code point.
                this.pos++;
                //NOTE: add a gap that should be avoided during retreat
                this._addGap();
                return getSurrogatePairCodePoint(cp, nextCp);
            }
        }
        //NOTE: we are at the end of a chunk, therefore we can't infer the surrogate pair yet.
        else if (!this.lastChunkWritten) {
            this.endOfChunkHit = true;
            return CODE_POINTS.EOF;
        }
        //NOTE: isolated surrogate
        this._err(ERR.surrogateInInputStream);
        return cp;
    }
    willDropParsedChunk() {
        return this.pos > this.bufferWaterline;
    }
    dropParsedChunk() {
        if (this.willDropParsedChunk()) {
            this.html = this.html.substring(this.pos);
            this.lineStartPos -= this.pos;
            this.droppedBufferSize += this.pos;
            this.pos = 0;
            this.lastGapPos = -2;
            this.gapStack.length = 0;
        }
    }
    write(chunk, isLastChunk) {
        if (this.html.length > 0) {
            this.html += chunk;
        }
        else {
            this.html = chunk;
        }
        this.endOfChunkHit = false;
        this.lastChunkWritten = isLastChunk;
    }
    insertHtmlAtCurrentPos(chunk) {
        this.html = this.html.substring(0, this.pos + 1) + chunk + this.html.substring(this.pos + 1);
        this.endOfChunkHit = false;
    }
    startsWith(pattern, caseSensitive) {
        // Check if our buffer has enough characters
        if (this.pos + pattern.length > this.html.length) {
            this.endOfChunkHit = !this.lastChunkWritten;
            return false;
        }
        if (caseSensitive) {
            return this.html.startsWith(pattern, this.pos);
        }
        for (let i = 0; i < pattern.length; i++) {
            const cp = this.html.charCodeAt(this.pos + i) | 0x20;
            if (cp !== pattern.charCodeAt(i)) {
                return false;
            }
        }
        return true;
    }
    peek(offset) {
        const pos = this.pos + offset;
        if (pos >= this.html.length) {
            this.endOfChunkHit = !this.lastChunkWritten;
            return CODE_POINTS.EOF;
        }
        const code = this.html.charCodeAt(pos);
        return code === CODE_POINTS.CARRIAGE_RETURN ? CODE_POINTS.LINE_FEED : code;
    }
    advance() {
        this.pos++;
        //NOTE: LF should be in the last column of the line
        if (this.isEol) {
            this.isEol = false;
            this.line++;
            this.lineStartPos = this.pos;
        }
        if (this.pos >= this.html.length) {
            this.endOfChunkHit = !this.lastChunkWritten;
            return CODE_POINTS.EOF;
        }
        let cp = this.html.charCodeAt(this.pos);
        //NOTE: all U+000D CARRIAGE RETURN (CR) characters must be converted to U+000A LINE FEED (LF) characters
        if (cp === CODE_POINTS.CARRIAGE_RETURN) {
            this.isEol = true;
            this.skipNextNewLine = true;
            return CODE_POINTS.LINE_FEED;
        }
        //NOTE: any U+000A LINE FEED (LF) characters that immediately follow a U+000D CARRIAGE RETURN (CR) character
        //must be ignored.
        if (cp === CODE_POINTS.LINE_FEED) {
            this.isEol = true;
            if (this.skipNextNewLine) {
                // `line` will be bumped again in the recursive call.
                this.line--;
                this.skipNextNewLine = false;
                this._addGap();
                return this.advance();
            }
        }
        this.skipNextNewLine = false;
        if (isSurrogate(cp)) {
            cp = this._processSurrogate(cp);
        }
        //OPTIMIZATION: first check if code point is in the common allowed
        //range (ASCII alphanumeric, whitespaces, big chunk of BMP)
        //before going into detailed performance cost validation.
        const isCommonValidRange = this.handler.onParseError === null ||
            (cp > 0x1f && cp < 0x7f) ||
            cp === CODE_POINTS.LINE_FEED ||
            cp === CODE_POINTS.CARRIAGE_RETURN ||
            (cp > 0x9f && cp < 64976);
        if (!isCommonValidRange) {
            this._checkForProblematicCharacters(cp);
        }
        return cp;
    }
    _checkForProblematicCharacters(cp) {
        if (isControlCodePoint(cp)) {
            this._err(ERR.controlCharacterInInputStream);
        }
        else if (isUndefinedCodePoint(cp)) {
            this._err(ERR.noncharacterInInputStream);
        }
    }
    retreat(count) {
        this.pos -= count;
        while (this.pos < this.lastGapPos) {
            this.lastGapPos = this.gapStack.pop();
            this.pos--;
        }
        this.isEol = false;
    }
}

var TokenType;
(function (TokenType) {
    TokenType[TokenType["CHARACTER"] = 0] = "CHARACTER";
    TokenType[TokenType["NULL_CHARACTER"] = 1] = "NULL_CHARACTER";
    TokenType[TokenType["WHITESPACE_CHARACTER"] = 2] = "WHITESPACE_CHARACTER";
    TokenType[TokenType["START_TAG"] = 3] = "START_TAG";
    TokenType[TokenType["END_TAG"] = 4] = "END_TAG";
    TokenType[TokenType["COMMENT"] = 5] = "COMMENT";
    TokenType[TokenType["DOCTYPE"] = 6] = "DOCTYPE";
    TokenType[TokenType["EOF"] = 7] = "EOF";
    TokenType[TokenType["HIBERNATION"] = 8] = "HIBERNATION";
})(TokenType || (TokenType = {}));
function getTokenAttr(token, attrName) {
    for (let i = token.attrs.length - 1; i >= 0; i--) {
        if (token.attrs[i].name === attrName) {
            return token.attrs[i].value;
        }
    }
    return null;
}

// Generated using scripts/write-decode-map.ts
const htmlDecodeTree = /* #__PURE__ */ new Uint16Array(
// prettier-ignore
/* #__PURE__ */ "\u1d41<\xd5\u0131\u028a\u049d\u057b\u05d0\u0675\u06de\u07a2\u07d6\u080f\u0a4a\u0a91\u0da1\u0e6d\u0f09\u0f26\u10ca\u1228\u12e1\u1415\u149d\u14c3\u14df\u1525\0\0\0\0\0\0\u156b\u16cd\u198d\u1c12\u1ddd\u1f7e\u2060\u21b0\u228d\u23c0\u23fb\u2442\u2824\u2912\u2d08\u2e48\u2fce\u3016\u32ba\u3639\u37ac\u38fe\u3a28\u3a71\u3ae0\u3b2e\u0800EMabcfglmnoprstu\\bfms\x7f\x84\x8b\x90\x95\x98\xa6\xb3\xb9\xc8\xcflig\u803b\xc6\u40c6P\u803b&\u4026cute\u803b\xc1\u40c1reve;\u4102\u0100iyx}rc\u803b\xc2\u40c2;\u4410r;\uc000\ud835\udd04rave\u803b\xc0\u40c0pha;\u4391acr;\u4100d;\u6a53\u0100gp\x9d\xa1on;\u4104f;\uc000\ud835\udd38plyFunction;\u6061ing\u803b\xc5\u40c5\u0100cs\xbe\xc3r;\uc000\ud835\udc9cign;\u6254ilde\u803b\xc3\u40c3ml\u803b\xc4\u40c4\u0400aceforsu\xe5\xfb\xfe\u0117\u011c\u0122\u0127\u012a\u0100cr\xea\xf2kslash;\u6216\u0176\xf6\xf8;\u6ae7ed;\u6306y;\u4411\u0180crt\u0105\u010b\u0114ause;\u6235noullis;\u612ca;\u4392r;\uc000\ud835\udd05pf;\uc000\ud835\udd39eve;\u42d8c\xf2\u0113mpeq;\u624e\u0700HOacdefhilorsu\u014d\u0151\u0156\u0180\u019e\u01a2\u01b5\u01b7\u01ba\u01dc\u0215\u0273\u0278\u027ecy;\u4427PY\u803b\xa9\u40a9\u0180cpy\u015d\u0162\u017aute;\u4106\u0100;i\u0167\u0168\u62d2talDifferentialD;\u6145leys;\u612d\u0200aeio\u0189\u018e\u0194\u0198ron;\u410cdil\u803b\xc7\u40c7rc;\u4108nint;\u6230ot;\u410a\u0100dn\u01a7\u01adilla;\u40b8terDot;\u40b7\xf2\u017fi;\u43a7rcle\u0200DMPT\u01c7\u01cb\u01d1\u01d6ot;\u6299inus;\u6296lus;\u6295imes;\u6297o\u0100cs\u01e2\u01f8kwiseContourIntegral;\u6232eCurly\u0100DQ\u0203\u020foubleQuote;\u601duote;\u6019\u0200lnpu\u021e\u0228\u0247\u0255on\u0100;e\u0225\u0226\u6237;\u6a74\u0180git\u022f\u0236\u023aruent;\u6261nt;\u622fourIntegral;\u622e\u0100fr\u024c\u024e;\u6102oduct;\u6210nterClockwiseContourIntegral;\u6233oss;\u6a2fcr;\uc000\ud835\udc9ep\u0100;C\u0284\u0285\u62d3ap;\u624d\u0580DJSZacefios\u02a0\u02ac\u02b0\u02b4\u02b8\u02cb\u02d7\u02e1\u02e6\u0333\u048d\u0100;o\u0179\u02a5trahd;\u6911cy;\u4402cy;\u4405cy;\u440f\u0180grs\u02bf\u02c4\u02c7ger;\u6021r;\u61a1hv;\u6ae4\u0100ay\u02d0\u02d5ron;\u410e;\u4414l\u0100;t\u02dd\u02de\u6207a;\u4394r;\uc000\ud835\udd07\u0100af\u02eb\u0327\u0100cm\u02f0\u0322ritical\u0200ADGT\u0300\u0306\u0316\u031ccute;\u40b4o\u0174\u030b\u030d;\u42d9bleAcute;\u42ddrave;\u4060ilde;\u42dcond;\u62c4ferentialD;\u6146\u0470\u033d\0\0\0\u0342\u0354\0\u0405f;\uc000\ud835\udd3b\u0180;DE\u0348\u0349\u034d\u40a8ot;\u60dcqual;\u6250ble\u0300CDLRUV\u0363\u0372\u0382\u03cf\u03e2\u03f8ontourIntegra\xec\u0239o\u0274\u0379\0\0\u037b\xbb\u0349nArrow;\u61d3\u0100eo\u0387\u03a4ft\u0180ART\u0390\u0396\u03a1rrow;\u61d0ightArrow;\u61d4e\xe5\u02cang\u0100LR\u03ab\u03c4eft\u0100AR\u03b3\u03b9rrow;\u67f8ightArrow;\u67faightArrow;\u67f9ight\u0100AT\u03d8\u03derrow;\u61d2ee;\u62a8p\u0241\u03e9\0\0\u03efrrow;\u61d1ownArrow;\u61d5erticalBar;\u6225n\u0300ABLRTa\u0412\u042a\u0430\u045e\u047f\u037crrow\u0180;BU\u041d\u041e\u0422\u6193ar;\u6913pArrow;\u61f5reve;\u4311eft\u02d2\u043a\0\u0446\0\u0450ightVector;\u6950eeVector;\u695eector\u0100;B\u0459\u045a\u61bdar;\u6956ight\u01d4\u0467\0\u0471eeVector;\u695fector\u0100;B\u047a\u047b\u61c1ar;\u6957ee\u0100;A\u0486\u0487\u62a4rrow;\u61a7\u0100ct\u0492\u0497r;\uc000\ud835\udc9frok;\u4110\u0800NTacdfglmopqstux\u04bd\u04c0\u04c4\u04cb\u04de\u04e2\u04e7\u04ee\u04f5\u0521\u052f\u0536\u0552\u055d\u0560\u0565G;\u414aH\u803b\xd0\u40d0cute\u803b\xc9\u40c9\u0180aiy\u04d2\u04d7\u04dcron;\u411arc\u803b\xca\u40ca;\u442dot;\u4116r;\uc000\ud835\udd08rave\u803b\xc8\u40c8ement;\u6208\u0100ap\u04fa\u04fecr;\u4112ty\u0253\u0506\0\0\u0512mallSquare;\u65fberySmallSquare;\u65ab\u0100gp\u0526\u052aon;\u4118f;\uc000\ud835\udd3csilon;\u4395u\u0100ai\u053c\u0549l\u0100;T\u0542\u0543\u6a75ilde;\u6242librium;\u61cc\u0100ci\u0557\u055ar;\u6130m;\u6a73a;\u4397ml\u803b\xcb\u40cb\u0100ip\u056a\u056fsts;\u6203onentialE;\u6147\u0280cfios\u0585\u0588\u058d\u05b2\u05ccy;\u4424r;\uc000\ud835\udd09lled\u0253\u0597\0\0\u05a3mallSquare;\u65fcerySmallSquare;\u65aa\u0370\u05ba\0\u05bf\0\0\u05c4f;\uc000\ud835\udd3dAll;\u6200riertrf;\u6131c\xf2\u05cb\u0600JTabcdfgorst\u05e8\u05ec\u05ef\u05fa\u0600\u0612\u0616\u061b\u061d\u0623\u066c\u0672cy;\u4403\u803b>\u403emma\u0100;d\u05f7\u05f8\u4393;\u43dcreve;\u411e\u0180eiy\u0607\u060c\u0610dil;\u4122rc;\u411c;\u4413ot;\u4120r;\uc000\ud835\udd0a;\u62d9pf;\uc000\ud835\udd3eeater\u0300EFGLST\u0635\u0644\u064e\u0656\u065b\u0666qual\u0100;L\u063e\u063f\u6265ess;\u62dbullEqual;\u6267reater;\u6aa2ess;\u6277lantEqual;\u6a7eilde;\u6273cr;\uc000\ud835\udca2;\u626b\u0400Aacfiosu\u0685\u068b\u0696\u069b\u069e\u06aa\u06be\u06caRDcy;\u442a\u0100ct\u0690\u0694ek;\u42c7;\u405eirc;\u4124r;\u610clbertSpace;\u610b\u01f0\u06af\0\u06b2f;\u610dizontalLine;\u6500\u0100ct\u06c3\u06c5\xf2\u06a9rok;\u4126mp\u0144\u06d0\u06d8ownHum\xf0\u012fqual;\u624f\u0700EJOacdfgmnostu\u06fa\u06fe\u0703\u0707\u070e\u071a\u071e\u0721\u0728\u0744\u0778\u078b\u078f\u0795cy;\u4415lig;\u4132cy;\u4401cute\u803b\xcd\u40cd\u0100iy\u0713\u0718rc\u803b\xce\u40ce;\u4418ot;\u4130r;\u6111rave\u803b\xcc\u40cc\u0180;ap\u0720\u072f\u073f\u0100cg\u0734\u0737r;\u412ainaryI;\u6148lie\xf3\u03dd\u01f4\u0749\0\u0762\u0100;e\u074d\u074e\u622c\u0100gr\u0753\u0758ral;\u622bsection;\u62c2isible\u0100CT\u076c\u0772omma;\u6063imes;\u6062\u0180gpt\u077f\u0783\u0788on;\u412ef;\uc000\ud835\udd40a;\u4399cr;\u6110ilde;\u4128\u01eb\u079a\0\u079ecy;\u4406l\u803b\xcf\u40cf\u0280cfosu\u07ac\u07b7\u07bc\u07c2\u07d0\u0100iy\u07b1\u07b5rc;\u4134;\u4419r;\uc000\ud835\udd0dpf;\uc000\ud835\udd41\u01e3\u07c7\0\u07ccr;\uc000\ud835\udca5rcy;\u4408kcy;\u4404\u0380HJacfos\u07e4\u07e8\u07ec\u07f1\u07fd\u0802\u0808cy;\u4425cy;\u440cppa;\u439a\u0100ey\u07f6\u07fbdil;\u4136;\u441ar;\uc000\ud835\udd0epf;\uc000\ud835\udd42cr;\uc000\ud835\udca6\u0580JTaceflmost\u0825\u0829\u082c\u0850\u0863\u09b3\u09b8\u09c7\u09cd\u0a37\u0a47cy;\u4409\u803b<\u403c\u0280cmnpr\u0837\u083c\u0841\u0844\u084dute;\u4139bda;\u439bg;\u67ealacetrf;\u6112r;\u619e\u0180aey\u0857\u085c\u0861ron;\u413ddil;\u413b;\u441b\u0100fs\u0868\u0970t\u0500ACDFRTUVar\u087e\u08a9\u08b1\u08e0\u08e6\u08fc\u092f\u095b\u0390\u096a\u0100nr\u0883\u088fgleBracket;\u67e8row\u0180;BR\u0899\u089a\u089e\u6190ar;\u61e4ightArrow;\u61c6eiling;\u6308o\u01f5\u08b7\0\u08c3bleBracket;\u67e6n\u01d4\u08c8\0\u08d2eeVector;\u6961ector\u0100;B\u08db\u08dc\u61c3ar;\u6959loor;\u630aight\u0100AV\u08ef\u08f5rrow;\u6194ector;\u694e\u0100er\u0901\u0917e\u0180;AV\u0909\u090a\u0910\u62a3rrow;\u61a4ector;\u695aiangle\u0180;BE\u0924\u0925\u0929\u62b2ar;\u69cfqual;\u62b4p\u0180DTV\u0937\u0942\u094cownVector;\u6951eeVector;\u6960ector\u0100;B\u0956\u0957\u61bfar;\u6958ector\u0100;B\u0965\u0966\u61bcar;\u6952ight\xe1\u039cs\u0300EFGLST\u097e\u098b\u0995\u099d\u09a2\u09adqualGreater;\u62daullEqual;\u6266reater;\u6276ess;\u6aa1lantEqual;\u6a7dilde;\u6272r;\uc000\ud835\udd0f\u0100;e\u09bd\u09be\u62d8ftarrow;\u61daidot;\u413f\u0180npw\u09d4\u0a16\u0a1bg\u0200LRlr\u09de\u09f7\u0a02\u0a10eft\u0100AR\u09e6\u09ecrrow;\u67f5ightArrow;\u67f7ightArrow;\u67f6eft\u0100ar\u03b3\u0a0aight\xe1\u03bfight\xe1\u03caf;\uc000\ud835\udd43er\u0100LR\u0a22\u0a2ceftArrow;\u6199ightArrow;\u6198\u0180cht\u0a3e\u0a40\u0a42\xf2\u084c;\u61b0rok;\u4141;\u626a\u0400acefiosu\u0a5a\u0a5d\u0a60\u0a77\u0a7c\u0a85\u0a8b\u0a8ep;\u6905y;\u441c\u0100dl\u0a65\u0a6fiumSpace;\u605flintrf;\u6133r;\uc000\ud835\udd10nusPlus;\u6213pf;\uc000\ud835\udd44c\xf2\u0a76;\u439c\u0480Jacefostu\u0aa3\u0aa7\u0aad\u0ac0\u0b14\u0b19\u0d91\u0d97\u0d9ecy;\u440acute;\u4143\u0180aey\u0ab4\u0ab9\u0aberon;\u4147dil;\u4145;\u441d\u0180gsw\u0ac7\u0af0\u0b0eative\u0180MTV\u0ad3\u0adf\u0ae8ediumSpace;\u600bhi\u0100cn\u0ae6\u0ad8\xeb\u0ad9eryThi\xee\u0ad9ted\u0100GL\u0af8\u0b06reaterGreate\xf2\u0673essLes\xf3\u0a48Line;\u400ar;\uc000\ud835\udd11\u0200Bnpt\u0b22\u0b28\u0b37\u0b3areak;\u6060BreakingSpace;\u40a0f;\u6115\u0680;CDEGHLNPRSTV\u0b55\u0b56\u0b6a\u0b7c\u0ba1\u0beb\u0c04\u0c5e\u0c84\u0ca6\u0cd8\u0d61\u0d85\u6aec\u0100ou\u0b5b\u0b64ngruent;\u6262pCap;\u626doubleVerticalBar;\u6226\u0180lqx\u0b83\u0b8a\u0b9bement;\u6209ual\u0100;T\u0b92\u0b93\u6260ilde;\uc000\u2242\u0338ists;\u6204reater\u0380;EFGLST\u0bb6\u0bb7\u0bbd\u0bc9\u0bd3\u0bd8\u0be5\u626fqual;\u6271ullEqual;\uc000\u2267\u0338reater;\uc000\u226b\u0338ess;\u6279lantEqual;\uc000\u2a7e\u0338ilde;\u6275ump\u0144\u0bf2\u0bfdownHump;\uc000\u224e\u0338qual;\uc000\u224f\u0338e\u0100fs\u0c0a\u0c27tTriangle\u0180;BE\u0c1a\u0c1b\u0c21\u62eaar;\uc000\u29cf\u0338qual;\u62ecs\u0300;EGLST\u0c35\u0c36\u0c3c\u0c44\u0c4b\u0c58\u626equal;\u6270reater;\u6278ess;\uc000\u226a\u0338lantEqual;\uc000\u2a7d\u0338ilde;\u6274ested\u0100GL\u0c68\u0c79reaterGreater;\uc000\u2aa2\u0338essLess;\uc000\u2aa1\u0338recedes\u0180;ES\u0c92\u0c93\u0c9b\u6280qual;\uc000\u2aaf\u0338lantEqual;\u62e0\u0100ei\u0cab\u0cb9verseElement;\u620cghtTriangle\u0180;BE\u0ccb\u0ccc\u0cd2\u62ebar;\uc000\u29d0\u0338qual;\u62ed\u0100qu\u0cdd\u0d0cuareSu\u0100bp\u0ce8\u0cf9set\u0100;E\u0cf0\u0cf3\uc000\u228f\u0338qual;\u62e2erset\u0100;E\u0d03\u0d06\uc000\u2290\u0338qual;\u62e3\u0180bcp\u0d13\u0d24\u0d4eset\u0100;E\u0d1b\u0d1e\uc000\u2282\u20d2qual;\u6288ceeds\u0200;EST\u0d32\u0d33\u0d3b\u0d46\u6281qual;\uc000\u2ab0\u0338lantEqual;\u62e1ilde;\uc000\u227f\u0338erset\u0100;E\u0d58\u0d5b\uc000\u2283\u20d2qual;\u6289ilde\u0200;EFT\u0d6e\u0d6f\u0d75\u0d7f\u6241qual;\u6244ullEqual;\u6247ilde;\u6249erticalBar;\u6224cr;\uc000\ud835\udca9ilde\u803b\xd1\u40d1;\u439d\u0700Eacdfgmoprstuv\u0dbd\u0dc2\u0dc9\u0dd5\u0ddb\u0de0\u0de7\u0dfc\u0e02\u0e20\u0e22\u0e32\u0e3f\u0e44lig;\u4152cute\u803b\xd3\u40d3\u0100iy\u0dce\u0dd3rc\u803b\xd4\u40d4;\u441eblac;\u4150r;\uc000\ud835\udd12rave\u803b\xd2\u40d2\u0180aei\u0dee\u0df2\u0df6cr;\u414cga;\u43a9cron;\u439fpf;\uc000\ud835\udd46enCurly\u0100DQ\u0e0e\u0e1aoubleQuote;\u601cuote;\u6018;\u6a54\u0100cl\u0e27\u0e2cr;\uc000\ud835\udcaaash\u803b\xd8\u40d8i\u016c\u0e37\u0e3cde\u803b\xd5\u40d5es;\u6a37ml\u803b\xd6\u40d6er\u0100BP\u0e4b\u0e60\u0100ar\u0e50\u0e53r;\u603eac\u0100ek\u0e5a\u0e5c;\u63deet;\u63b4arenthesis;\u63dc\u0480acfhilors\u0e7f\u0e87\u0e8a\u0e8f\u0e92\u0e94\u0e9d\u0eb0\u0efcrtialD;\u6202y;\u441fr;\uc000\ud835\udd13i;\u43a6;\u43a0usMinus;\u40b1\u0100ip\u0ea2\u0eadncareplan\xe5\u069df;\u6119\u0200;eio\u0eb9\u0eba\u0ee0\u0ee4\u6abbcedes\u0200;EST\u0ec8\u0ec9\u0ecf\u0eda\u627aqual;\u6aaflantEqual;\u627cilde;\u627eme;\u6033\u0100dp\u0ee9\u0eeeuct;\u620fortion\u0100;a\u0225\u0ef9l;\u621d\u0100ci\u0f01\u0f06r;\uc000\ud835\udcab;\u43a8\u0200Ufos\u0f11\u0f16\u0f1b\u0f1fOT\u803b\"\u4022r;\uc000\ud835\udd14pf;\u611acr;\uc000\ud835\udcac\u0600BEacefhiorsu\u0f3e\u0f43\u0f47\u0f60\u0f73\u0fa7\u0faa\u0fad\u1096\u10a9\u10b4\u10bearr;\u6910G\u803b\xae\u40ae\u0180cnr\u0f4e\u0f53\u0f56ute;\u4154g;\u67ebr\u0100;t\u0f5c\u0f5d\u61a0l;\u6916\u0180aey\u0f67\u0f6c\u0f71ron;\u4158dil;\u4156;\u4420\u0100;v\u0f78\u0f79\u611cerse\u0100EU\u0f82\u0f99\u0100lq\u0f87\u0f8eement;\u620builibrium;\u61cbpEquilibrium;\u696fr\xbb\u0f79o;\u43a1ght\u0400ACDFTUVa\u0fc1\u0feb\u0ff3\u1022\u1028\u105b\u1087\u03d8\u0100nr\u0fc6\u0fd2gleBracket;\u67e9row\u0180;BL\u0fdc\u0fdd\u0fe1\u6192ar;\u61e5eftArrow;\u61c4eiling;\u6309o\u01f5\u0ff9\0\u1005bleBracket;\u67e7n\u01d4\u100a\0\u1014eeVector;\u695dector\u0100;B\u101d\u101e\u61c2ar;\u6955loor;\u630b\u0100er\u102d\u1043e\u0180;AV\u1035\u1036\u103c\u62a2rrow;\u61a6ector;\u695biangle\u0180;BE\u1050\u1051\u1055\u62b3ar;\u69d0qual;\u62b5p\u0180DTV\u1063\u106e\u1078ownVector;\u694feeVector;\u695cector\u0100;B\u1082\u1083\u61bear;\u6954ector\u0100;B\u1091\u1092\u61c0ar;\u6953\u0100pu\u109b\u109ef;\u611dndImplies;\u6970ightarrow;\u61db\u0100ch\u10b9\u10bcr;\u611b;\u61b1leDelayed;\u69f4\u0680HOacfhimoqstu\u10e4\u10f1\u10f7\u10fd\u1119\u111e\u1151\u1156\u1161\u1167\u11b5\u11bb\u11bf\u0100Cc\u10e9\u10eeHcy;\u4429y;\u4428FTcy;\u442ccute;\u415a\u0280;aeiy\u1108\u1109\u110e\u1113\u1117\u6abcron;\u4160dil;\u415erc;\u415c;\u4421r;\uc000\ud835\udd16ort\u0200DLRU\u112a\u1134\u113e\u1149ownArrow\xbb\u041eeftArrow\xbb\u089aightArrow\xbb\u0fddpArrow;\u6191gma;\u43a3allCircle;\u6218pf;\uc000\ud835\udd4a\u0272\u116d\0\0\u1170t;\u621aare\u0200;ISU\u117b\u117c\u1189\u11af\u65a1ntersection;\u6293u\u0100bp\u118f\u119eset\u0100;E\u1197\u1198\u628fqual;\u6291erset\u0100;E\u11a8\u11a9\u6290qual;\u6292nion;\u6294cr;\uc000\ud835\udcaear;\u62c6\u0200bcmp\u11c8\u11db\u1209\u120b\u0100;s\u11cd\u11ce\u62d0et\u0100;E\u11cd\u11d5qual;\u6286\u0100ch\u11e0\u1205eeds\u0200;EST\u11ed\u11ee\u11f4\u11ff\u627bqual;\u6ab0lantEqual;\u627dilde;\u627fTh\xe1\u0f8c;\u6211\u0180;es\u1212\u1213\u1223\u62d1rset\u0100;E\u121c\u121d\u6283qual;\u6287et\xbb\u1213\u0580HRSacfhiors\u123e\u1244\u1249\u1255\u125e\u1271\u1276\u129f\u12c2\u12c8\u12d1ORN\u803b\xde\u40deADE;\u6122\u0100Hc\u124e\u1252cy;\u440by;\u4426\u0100bu\u125a\u125c;\u4009;\u43a4\u0180aey\u1265\u126a\u126fron;\u4164dil;\u4162;\u4422r;\uc000\ud835\udd17\u0100ei\u127b\u1289\u01f2\u1280\0\u1287efore;\u6234a;\u4398\u0100cn\u128e\u1298kSpace;\uc000\u205f\u200aSpace;\u6009lde\u0200;EFT\u12ab\u12ac\u12b2\u12bc\u623cqual;\u6243ullEqual;\u6245ilde;\u6248pf;\uc000\ud835\udd4bipleDot;\u60db\u0100ct\u12d6\u12dbr;\uc000\ud835\udcafrok;\u4166\u0ae1\u12f7\u130e\u131a\u1326\0\u132c\u1331\0\0\0\0\0\u1338\u133d\u1377\u1385\0\u13ff\u1404\u140a\u1410\u0100cr\u12fb\u1301ute\u803b\xda\u40dar\u0100;o\u1307\u1308\u619fcir;\u6949r\u01e3\u1313\0\u1316y;\u440eve;\u416c\u0100iy\u131e\u1323rc\u803b\xdb\u40db;\u4423blac;\u4170r;\uc000\ud835\udd18rave\u803b\xd9\u40d9acr;\u416a\u0100di\u1341\u1369er\u0100BP\u1348\u135d\u0100ar\u134d\u1350r;\u405fac\u0100ek\u1357\u1359;\u63dfet;\u63b5arenthesis;\u63ddon\u0100;P\u1370\u1371\u62c3lus;\u628e\u0100gp\u137b\u137fon;\u4172f;\uc000\ud835\udd4c\u0400ADETadps\u1395\u13ae\u13b8\u13c4\u03e8\u13d2\u13d7\u13f3rrow\u0180;BD\u1150\u13a0\u13a4ar;\u6912ownArrow;\u61c5ownArrow;\u6195quilibrium;\u696eee\u0100;A\u13cb\u13cc\u62a5rrow;\u61a5own\xe1\u03f3er\u0100LR\u13de\u13e8eftArrow;\u6196ightArrow;\u6197i\u0100;l\u13f9\u13fa\u43d2on;\u43a5ing;\u416ecr;\uc000\ud835\udcb0ilde;\u4168ml\u803b\xdc\u40dc\u0480Dbcdefosv\u1427\u142c\u1430\u1433\u143e\u1485\u148a\u1490\u1496ash;\u62abar;\u6aeby;\u4412ash\u0100;l\u143b\u143c\u62a9;\u6ae6\u0100er\u1443\u1445;\u62c1\u0180bty\u144c\u1450\u147aar;\u6016\u0100;i\u144f\u1455cal\u0200BLST\u1461\u1465\u146a\u1474ar;\u6223ine;\u407ceparator;\u6758ilde;\u6240ThinSpace;\u600ar;\uc000\ud835\udd19pf;\uc000\ud835\udd4dcr;\uc000\ud835\udcb1dash;\u62aa\u0280cefos\u14a7\u14ac\u14b1\u14b6\u14bcirc;\u4174dge;\u62c0r;\uc000\ud835\udd1apf;\uc000\ud835\udd4ecr;\uc000\ud835\udcb2\u0200fios\u14cb\u14d0\u14d2\u14d8r;\uc000\ud835\udd1b;\u439epf;\uc000\ud835\udd4fcr;\uc000\ud835\udcb3\u0480AIUacfosu\u14f1\u14f5\u14f9\u14fd\u1504\u150f\u1514\u151a\u1520cy;\u442fcy;\u4407cy;\u442ecute\u803b\xdd\u40dd\u0100iy\u1509\u150drc;\u4176;\u442br;\uc000\ud835\udd1cpf;\uc000\ud835\udd50cr;\uc000\ud835\udcb4ml;\u4178\u0400Hacdefos\u1535\u1539\u153f\u154b\u154f\u155d\u1560\u1564cy;\u4416cute;\u4179\u0100ay\u1544\u1549ron;\u417d;\u4417ot;\u417b\u01f2\u1554\0\u155boWidt\xe8\u0ad9a;\u4396r;\u6128pf;\u6124cr;\uc000\ud835\udcb5\u0be1\u1583\u158a\u1590\0\u15b0\u15b6\u15bf\0\0\0\0\u15c6\u15db\u15eb\u165f\u166d\0\u1695\u169b\u16b2\u16b9\0\u16becute\u803b\xe1\u40e1reve;\u4103\u0300;Ediuy\u159c\u159d\u15a1\u15a3\u15a8\u15ad\u623e;\uc000\u223e\u0333;\u623frc\u803b\xe2\u40e2te\u80bb\xb4\u0306;\u4430lig\u803b\xe6\u40e6\u0100;r\xb2\u15ba;\uc000\ud835\udd1erave\u803b\xe0\u40e0\u0100ep\u15ca\u15d6\u0100fp\u15cf\u15d4sym;\u6135\xe8\u15d3ha;\u43b1\u0100ap\u15dfc\u0100cl\u15e4\u15e7r;\u4101g;\u6a3f\u0264\u15f0\0\0\u160a\u0280;adsv\u15fa\u15fb\u15ff\u1601\u1607\u6227nd;\u6a55;\u6a5clope;\u6a58;\u6a5a\u0380;elmrsz\u1618\u1619\u161b\u161e\u163f\u164f\u1659\u6220;\u69a4e\xbb\u1619sd\u0100;a\u1625\u1626\u6221\u0461\u1630\u1632\u1634\u1636\u1638\u163a\u163c\u163e;\u69a8;\u69a9;\u69aa;\u69ab;\u69ac;\u69ad;\u69ae;\u69aft\u0100;v\u1645\u1646\u621fb\u0100;d\u164c\u164d\u62be;\u699d\u0100pt\u1654\u1657h;\u6222\xbb\xb9arr;\u637c\u0100gp\u1663\u1667on;\u4105f;\uc000\ud835\udd52\u0380;Eaeiop\u12c1\u167b\u167d\u1682\u1684\u1687\u168a;\u6a70cir;\u6a6f;\u624ad;\u624bs;\u4027rox\u0100;e\u12c1\u1692\xf1\u1683ing\u803b\xe5\u40e5\u0180cty\u16a1\u16a6\u16a8r;\uc000\ud835\udcb6;\u402amp\u0100;e\u12c1\u16af\xf1\u0288ilde\u803b\xe3\u40e3ml\u803b\xe4\u40e4\u0100ci\u16c2\u16c8onin\xf4\u0272nt;\u6a11\u0800Nabcdefiklnoprsu\u16ed\u16f1\u1730\u173c\u1743\u1748\u1778\u177d\u17e0\u17e6\u1839\u1850\u170d\u193d\u1948\u1970ot;\u6aed\u0100cr\u16f6\u171ek\u0200ceps\u1700\u1705\u170d\u1713ong;\u624cpsilon;\u43f6rime;\u6035im\u0100;e\u171a\u171b\u623dq;\u62cd\u0176\u1722\u1726ee;\u62bded\u0100;g\u172c\u172d\u6305e\xbb\u172drk\u0100;t\u135c\u1737brk;\u63b6\u0100oy\u1701\u1741;\u4431quo;\u601e\u0280cmprt\u1753\u175b\u1761\u1764\u1768aus\u0100;e\u010a\u0109ptyv;\u69b0s\xe9\u170cno\xf5\u0113\u0180ahw\u176f\u1771\u1773;\u43b2;\u6136een;\u626cr;\uc000\ud835\udd1fg\u0380costuvw\u178d\u179d\u17b3\u17c1\u17d5\u17db\u17de\u0180aiu\u1794\u1796\u179a\xf0\u0760rc;\u65efp\xbb\u1371\u0180dpt\u17a4\u17a8\u17adot;\u6a00lus;\u6a01imes;\u6a02\u0271\u17b9\0\0\u17becup;\u6a06ar;\u6605riangle\u0100du\u17cd\u17d2own;\u65bdp;\u65b3plus;\u6a04e\xe5\u1444\xe5\u14adarow;\u690d\u0180ako\u17ed\u1826\u1835\u0100cn\u17f2\u1823k\u0180lst\u17fa\u05ab\u1802ozenge;\u69ebriangle\u0200;dlr\u1812\u1813\u1818\u181d\u65b4own;\u65beeft;\u65c2ight;\u65b8k;\u6423\u01b1\u182b\0\u1833\u01b2\u182f\0\u1831;\u6592;\u65914;\u6593ck;\u6588\u0100eo\u183e\u184d\u0100;q\u1843\u1846\uc000=\u20e5uiv;\uc000\u2261\u20e5t;\u6310\u0200ptwx\u1859\u185e\u1867\u186cf;\uc000\ud835\udd53\u0100;t\u13cb\u1863om\xbb\u13cctie;\u62c8\u0600DHUVbdhmptuv\u1885\u1896\u18aa\u18bb\u18d7\u18db\u18ec\u18ff\u1905\u190a\u1910\u1921\u0200LRlr\u188e\u1890\u1892\u1894;\u6557;\u6554;\u6556;\u6553\u0280;DUdu\u18a1\u18a2\u18a4\u18a6\u18a8\u6550;\u6566;\u6569;\u6564;\u6567\u0200LRlr\u18b3\u18b5\u18b7\u18b9;\u655d;\u655a;\u655c;\u6559\u0380;HLRhlr\u18ca\u18cb\u18cd\u18cf\u18d1\u18d3\u18d5\u6551;\u656c;\u6563;\u6560;\u656b;\u6562;\u655fox;\u69c9\u0200LRlr\u18e4\u18e6\u18e8\u18ea;\u6555;\u6552;\u6510;\u650c\u0280;DUdu\u06bd\u18f7\u18f9\u18fb\u18fd;\u6565;\u6568;\u652c;\u6534inus;\u629flus;\u629eimes;\u62a0\u0200LRlr\u1919\u191b\u191d\u191f;\u655b;\u6558;\u6518;\u6514\u0380;HLRhlr\u1930\u1931\u1933\u1935\u1937\u1939\u193b\u6502;\u656a;\u6561;\u655e;\u653c;\u6524;\u651c\u0100ev\u0123\u1942bar\u803b\xa6\u40a6\u0200ceio\u1951\u1956\u195a\u1960r;\uc000\ud835\udcb7mi;\u604fm\u0100;e\u171a\u171cl\u0180;bh\u1968\u1969\u196b\u405c;\u69c5sub;\u67c8\u016c\u1974\u197el\u0100;e\u1979\u197a\u6022t\xbb\u197ap\u0180;Ee\u012f\u1985\u1987;\u6aae\u0100;q\u06dc\u06db\u0ce1\u19a7\0\u19e8\u1a11\u1a15\u1a32\0\u1a37\u1a50\0\0\u1ab4\0\0\u1ac1\0\0\u1b21\u1b2e\u1b4d\u1b52\0\u1bfd\0\u1c0c\u0180cpr\u19ad\u19b2\u19ddute;\u4107\u0300;abcds\u19bf\u19c0\u19c4\u19ca\u19d5\u19d9\u6229nd;\u6a44rcup;\u6a49\u0100au\u19cf\u19d2p;\u6a4bp;\u6a47ot;\u6a40;\uc000\u2229\ufe00\u0100eo\u19e2\u19e5t;\u6041\xee\u0693\u0200aeiu\u19f0\u19fb\u1a01\u1a05\u01f0\u19f5\0\u19f8s;\u6a4don;\u410ddil\u803b\xe7\u40e7rc;\u4109ps\u0100;s\u1a0c\u1a0d\u6a4cm;\u6a50ot;\u410b\u0180dmn\u1a1b\u1a20\u1a26il\u80bb\xb8\u01adptyv;\u69b2t\u8100\xa2;e\u1a2d\u1a2e\u40a2r\xe4\u01b2r;\uc000\ud835\udd20\u0180cei\u1a3d\u1a40\u1a4dy;\u4447ck\u0100;m\u1a47\u1a48\u6713ark\xbb\u1a48;\u43c7r\u0380;Ecefms\u1a5f\u1a60\u1a62\u1a6b\u1aa4\u1aaa\u1aae\u65cb;\u69c3\u0180;el\u1a69\u1a6a\u1a6d\u42c6q;\u6257e\u0261\u1a74\0\0\u1a88rrow\u0100lr\u1a7c\u1a81eft;\u61baight;\u61bb\u0280RSacd\u1a92\u1a94\u1a96\u1a9a\u1a9f\xbb\u0f47;\u64c8st;\u629birc;\u629aash;\u629dnint;\u6a10id;\u6aefcir;\u69c2ubs\u0100;u\u1abb\u1abc\u6663it\xbb\u1abc\u02ec\u1ac7\u1ad4\u1afa\0\u1b0aon\u0100;e\u1acd\u1ace\u403a\u0100;q\xc7\xc6\u026d\u1ad9\0\0\u1ae2a\u0100;t\u1ade\u1adf\u402c;\u4040\u0180;fl\u1ae8\u1ae9\u1aeb\u6201\xee\u1160e\u0100mx\u1af1\u1af6ent\xbb\u1ae9e\xf3\u024d\u01e7\u1afe\0\u1b07\u0100;d\u12bb\u1b02ot;\u6a6dn\xf4\u0246\u0180fry\u1b10\u1b14\u1b17;\uc000\ud835\udd54o\xe4\u0254\u8100\xa9;s\u0155\u1b1dr;\u6117\u0100ao\u1b25\u1b29rr;\u61b5ss;\u6717\u0100cu\u1b32\u1b37r;\uc000\ud835\udcb8\u0100bp\u1b3c\u1b44\u0100;e\u1b41\u1b42\u6acf;\u6ad1\u0100;e\u1b49\u1b4a\u6ad0;\u6ad2dot;\u62ef\u0380delprvw\u1b60\u1b6c\u1b77\u1b82\u1bac\u1bd4\u1bf9arr\u0100lr\u1b68\u1b6a;\u6938;\u6935\u0270\u1b72\0\0\u1b75r;\u62dec;\u62dfarr\u0100;p\u1b7f\u1b80\u61b6;\u693d\u0300;bcdos\u1b8f\u1b90\u1b96\u1ba1\u1ba5\u1ba8\u622arcap;\u6a48\u0100au\u1b9b\u1b9ep;\u6a46p;\u6a4aot;\u628dr;\u6a45;\uc000\u222a\ufe00\u0200alrv\u1bb5\u1bbf\u1bde\u1be3rr\u0100;m\u1bbc\u1bbd\u61b7;\u693cy\u0180evw\u1bc7\u1bd4\u1bd8q\u0270\u1bce\0\0\u1bd2re\xe3\u1b73u\xe3\u1b75ee;\u62ceedge;\u62cfen\u803b\xa4\u40a4earrow\u0100lr\u1bee\u1bf3eft\xbb\u1b80ight\xbb\u1bbde\xe4\u1bdd\u0100ci\u1c01\u1c07onin\xf4\u01f7nt;\u6231lcty;\u632d\u0980AHabcdefhijlorstuwz\u1c38\u1c3b\u1c3f\u1c5d\u1c69\u1c75\u1c8a\u1c9e\u1cac\u1cb7\u1cfb\u1cff\u1d0d\u1d7b\u1d91\u1dab\u1dbb\u1dc6\u1dcdr\xf2\u0381ar;\u6965\u0200glrs\u1c48\u1c4d\u1c52\u1c54ger;\u6020eth;\u6138\xf2\u1133h\u0100;v\u1c5a\u1c5b\u6010\xbb\u090a\u016b\u1c61\u1c67arow;\u690fa\xe3\u0315\u0100ay\u1c6e\u1c73ron;\u410f;\u4434\u0180;ao\u0332\u1c7c\u1c84\u0100gr\u02bf\u1c81r;\u61catseq;\u6a77\u0180glm\u1c91\u1c94\u1c98\u803b\xb0\u40b0ta;\u43b4ptyv;\u69b1\u0100ir\u1ca3\u1ca8sht;\u697f;\uc000\ud835\udd21ar\u0100lr\u1cb3\u1cb5\xbb\u08dc\xbb\u101e\u0280aegsv\u1cc2\u0378\u1cd6\u1cdc\u1ce0m\u0180;os\u0326\u1cca\u1cd4nd\u0100;s\u0326\u1cd1uit;\u6666amma;\u43ddin;\u62f2\u0180;io\u1ce7\u1ce8\u1cf8\u40f7de\u8100\xf7;o\u1ce7\u1cf0ntimes;\u62c7n\xf8\u1cf7cy;\u4452c\u026f\u1d06\0\0\u1d0arn;\u631eop;\u630d\u0280lptuw\u1d18\u1d1d\u1d22\u1d49\u1d55lar;\u4024f;\uc000\ud835\udd55\u0280;emps\u030b\u1d2d\u1d37\u1d3d\u1d42q\u0100;d\u0352\u1d33ot;\u6251inus;\u6238lus;\u6214quare;\u62a1blebarwedg\xe5\xfan\u0180adh\u112e\u1d5d\u1d67ownarrow\xf3\u1c83arpoon\u0100lr\u1d72\u1d76ef\xf4\u1cb4igh\xf4\u1cb6\u0162\u1d7f\u1d85karo\xf7\u0f42\u026f\u1d8a\0\0\u1d8ern;\u631fop;\u630c\u0180cot\u1d98\u1da3\u1da6\u0100ry\u1d9d\u1da1;\uc000\ud835\udcb9;\u4455l;\u69f6rok;\u4111\u0100dr\u1db0\u1db4ot;\u62f1i\u0100;f\u1dba\u1816\u65bf\u0100ah\u1dc0\u1dc3r\xf2\u0429a\xf2\u0fa6angle;\u69a6\u0100ci\u1dd2\u1dd5y;\u445fgrarr;\u67ff\u0900Dacdefglmnopqrstux\u1e01\u1e09\u1e19\u1e38\u0578\u1e3c\u1e49\u1e61\u1e7e\u1ea5\u1eaf\u1ebd\u1ee1\u1f2a\u1f37\u1f44\u1f4e\u1f5a\u0100Do\u1e06\u1d34o\xf4\u1c89\u0100cs\u1e0e\u1e14ute\u803b\xe9\u40e9ter;\u6a6e\u0200aioy\u1e22\u1e27\u1e31\u1e36ron;\u411br\u0100;c\u1e2d\u1e2e\u6256\u803b\xea\u40ealon;\u6255;\u444dot;\u4117\u0100Dr\u1e41\u1e45ot;\u6252;\uc000\ud835\udd22\u0180;rs\u1e50\u1e51\u1e57\u6a9aave\u803b\xe8\u40e8\u0100;d\u1e5c\u1e5d\u6a96ot;\u6a98\u0200;ils\u1e6a\u1e6b\u1e72\u1e74\u6a99nters;\u63e7;\u6113\u0100;d\u1e79\u1e7a\u6a95ot;\u6a97\u0180aps\u1e85\u1e89\u1e97cr;\u4113ty\u0180;sv\u1e92\u1e93\u1e95\u6205et\xbb\u1e93p\u01001;\u1e9d\u1ea4\u0133\u1ea1\u1ea3;\u6004;\u6005\u6003\u0100gs\u1eaa\u1eac;\u414bp;\u6002\u0100gp\u1eb4\u1eb8on;\u4119f;\uc000\ud835\udd56\u0180als\u1ec4\u1ece\u1ed2r\u0100;s\u1eca\u1ecb\u62d5l;\u69e3us;\u6a71i\u0180;lv\u1eda\u1edb\u1edf\u43b5on\xbb\u1edb;\u43f5\u0200csuv\u1eea\u1ef3\u1f0b\u1f23\u0100io\u1eef\u1e31rc\xbb\u1e2e\u0269\u1ef9\0\0\u1efb\xed\u0548ant\u0100gl\u1f02\u1f06tr\xbb\u1e5dess\xbb\u1e7a\u0180aei\u1f12\u1f16\u1f1als;\u403dst;\u625fv\u0100;D\u0235\u1f20D;\u6a78parsl;\u69e5\u0100Da\u1f2f\u1f33ot;\u6253rr;\u6971\u0180cdi\u1f3e\u1f41\u1ef8r;\u612fo\xf4\u0352\u0100ah\u1f49\u1f4b;\u43b7\u803b\xf0\u40f0\u0100mr\u1f53\u1f57l\u803b\xeb\u40ebo;\u60ac\u0180cip\u1f61\u1f64\u1f67l;\u4021s\xf4\u056e\u0100eo\u1f6c\u1f74ctatio\xee\u0559nential\xe5\u0579\u09e1\u1f92\0\u1f9e\0\u1fa1\u1fa7\0\0\u1fc6\u1fcc\0\u1fd3\0\u1fe6\u1fea\u2000\0\u2008\u205allingdotse\xf1\u1e44y;\u4444male;\u6640\u0180ilr\u1fad\u1fb3\u1fc1lig;\u8000\ufb03\u0269\u1fb9\0\0\u1fbdg;\u8000\ufb00ig;\u8000\ufb04;\uc000\ud835\udd23lig;\u8000\ufb01lig;\uc000fj\u0180alt\u1fd9\u1fdc\u1fe1t;\u666dig;\u8000\ufb02ns;\u65b1of;\u4192\u01f0\u1fee\0\u1ff3f;\uc000\ud835\udd57\u0100ak\u05bf\u1ff7\u0100;v\u1ffc\u1ffd\u62d4;\u6ad9artint;\u6a0d\u0100ao\u200c\u2055\u0100cs\u2011\u2052\u03b1\u201a\u2030\u2038\u2045\u2048\0\u2050\u03b2\u2022\u2025\u2027\u202a\u202c\0\u202e\u803b\xbd\u40bd;\u6153\u803b\xbc\u40bc;\u6155;\u6159;\u615b\u01b3\u2034\0\u2036;\u6154;\u6156\u02b4\u203e\u2041\0\0\u2043\u803b\xbe\u40be;\u6157;\u615c5;\u6158\u01b6\u204c\0\u204e;\u615a;\u615d8;\u615el;\u6044wn;\u6322cr;\uc000\ud835\udcbb\u0880Eabcdefgijlnorstv\u2082\u2089\u209f\u20a5\u20b0\u20b4\u20f0\u20f5\u20fa\u20ff\u2103\u2112\u2138\u0317\u213e\u2152\u219e\u0100;l\u064d\u2087;\u6a8c\u0180cmp\u2090\u2095\u209dute;\u41f5ma\u0100;d\u209c\u1cda\u43b3;\u6a86reve;\u411f\u0100iy\u20aa\u20aerc;\u411d;\u4433ot;\u4121\u0200;lqs\u063e\u0642\u20bd\u20c9\u0180;qs\u063e\u064c\u20c4lan\xf4\u0665\u0200;cdl\u0665\u20d2\u20d5\u20e5c;\u6aa9ot\u0100;o\u20dc\u20dd\u6a80\u0100;l\u20e2\u20e3\u6a82;\u6a84\u0100;e\u20ea\u20ed\uc000\u22db\ufe00s;\u6a94r;\uc000\ud835\udd24\u0100;g\u0673\u061bmel;\u6137cy;\u4453\u0200;Eaj\u065a\u210c\u210e\u2110;\u6a92;\u6aa5;\u6aa4\u0200Eaes\u211b\u211d\u2129\u2134;\u6269p\u0100;p\u2123\u2124\u6a8arox\xbb\u2124\u0100;q\u212e\u212f\u6a88\u0100;q\u212e\u211bim;\u62e7pf;\uc000\ud835\udd58\u0100ci\u2143\u2146r;\u610am\u0180;el\u066b\u214e\u2150;\u6a8e;\u6a90\u8300>;cdlqr\u05ee\u2160\u216a\u216e\u2173\u2179\u0100ci\u2165\u2167;\u6aa7r;\u6a7aot;\u62d7Par;\u6995uest;\u6a7c\u0280adels\u2184\u216a\u2190\u0656\u219b\u01f0\u2189\0\u218epro\xf8\u209er;\u6978q\u0100lq\u063f\u2196les\xf3\u2088i\xed\u066b\u0100en\u21a3\u21adrtneqq;\uc000\u2269\ufe00\xc5\u21aa\u0500Aabcefkosy\u21c4\u21c7\u21f1\u21f5\u21fa\u2218\u221d\u222f\u2268\u227dr\xf2\u03a0\u0200ilmr\u21d0\u21d4\u21d7\u21dbrs\xf0\u1484f\xbb\u2024il\xf4\u06a9\u0100dr\u21e0\u21e4cy;\u444a\u0180;cw\u08f4\u21eb\u21efir;\u6948;\u61adar;\u610firc;\u4125\u0180alr\u2201\u220e\u2213rts\u0100;u\u2209\u220a\u6665it\xbb\u220alip;\u6026con;\u62b9r;\uc000\ud835\udd25s\u0100ew\u2223\u2229arow;\u6925arow;\u6926\u0280amopr\u223a\u223e\u2243\u225e\u2263rr;\u61fftht;\u623bk\u0100lr\u2249\u2253eftarrow;\u61a9ightarrow;\u61aaf;\uc000\ud835\udd59bar;\u6015\u0180clt\u226f\u2274\u2278r;\uc000\ud835\udcbdas\xe8\u21f4rok;\u4127\u0100bp\u2282\u2287ull;\u6043hen\xbb\u1c5b\u0ae1\u22a3\0\u22aa\0\u22b8\u22c5\u22ce\0\u22d5\u22f3\0\0\u22f8\u2322\u2367\u2362\u237f\0\u2386\u23aa\u23b4cute\u803b\xed\u40ed\u0180;iy\u0771\u22b0\u22b5rc\u803b\xee\u40ee;\u4438\u0100cx\u22bc\u22bfy;\u4435cl\u803b\xa1\u40a1\u0100fr\u039f\u22c9;\uc000\ud835\udd26rave\u803b\xec\u40ec\u0200;ino\u073e\u22dd\u22e9\u22ee\u0100in\u22e2\u22e6nt;\u6a0ct;\u622dfin;\u69dcta;\u6129lig;\u4133\u0180aop\u22fe\u231a\u231d\u0180cgt\u2305\u2308\u2317r;\u412b\u0180elp\u071f\u230f\u2313in\xe5\u078ear\xf4\u0720h;\u4131f;\u62b7ed;\u41b5\u0280;cfot\u04f4\u232c\u2331\u233d\u2341are;\u6105in\u0100;t\u2338\u2339\u621eie;\u69dddo\xf4\u2319\u0280;celp\u0757\u234c\u2350\u235b\u2361al;\u62ba\u0100gr\u2355\u2359er\xf3\u1563\xe3\u234darhk;\u6a17rod;\u6a3c\u0200cgpt\u236f\u2372\u2376\u237by;\u4451on;\u412ff;\uc000\ud835\udd5aa;\u43b9uest\u803b\xbf\u40bf\u0100ci\u238a\u238fr;\uc000\ud835\udcben\u0280;Edsv\u04f4\u239b\u239d\u23a1\u04f3;\u62f9ot;\u62f5\u0100;v\u23a6\u23a7\u62f4;\u62f3\u0100;i\u0777\u23aelde;\u4129\u01eb\u23b8\0\u23bccy;\u4456l\u803b\xef\u40ef\u0300cfmosu\u23cc\u23d7\u23dc\u23e1\u23e7\u23f5\u0100iy\u23d1\u23d5rc;\u4135;\u4439r;\uc000\ud835\udd27ath;\u4237pf;\uc000\ud835\udd5b\u01e3\u23ec\0\u23f1r;\uc000\ud835\udcbfrcy;\u4458kcy;\u4454\u0400acfghjos\u240b\u2416\u2422\u2427\u242d\u2431\u2435\u243bppa\u0100;v\u2413\u2414\u43ba;\u43f0\u0100ey\u241b\u2420dil;\u4137;\u443ar;\uc000\ud835\udd28reen;\u4138cy;\u4445cy;\u445cpf;\uc000\ud835\udd5ccr;\uc000\ud835\udcc0\u0b80ABEHabcdefghjlmnoprstuv\u2470\u2481\u2486\u248d\u2491\u250e\u253d\u255a\u2580\u264e\u265e\u2665\u2679\u267d\u269a\u26b2\u26d8\u275d\u2768\u278b\u27c0\u2801\u2812\u0180art\u2477\u247a\u247cr\xf2\u09c6\xf2\u0395ail;\u691barr;\u690e\u0100;g\u0994\u248b;\u6a8bar;\u6962\u0963\u24a5\0\u24aa\0\u24b1\0\0\0\0\0\u24b5\u24ba\0\u24c6\u24c8\u24cd\0\u24f9ute;\u413amptyv;\u69b4ra\xee\u084cbda;\u43bbg\u0180;dl\u088e\u24c1\u24c3;\u6991\xe5\u088e;\u6a85uo\u803b\xab\u40abr\u0400;bfhlpst\u0899\u24de\u24e6\u24e9\u24eb\u24ee\u24f1\u24f5\u0100;f\u089d\u24e3s;\u691fs;\u691d\xeb\u2252p;\u61abl;\u6939im;\u6973l;\u61a2\u0180;ae\u24ff\u2500\u2504\u6aabil;\u6919\u0100;s\u2509\u250a\u6aad;\uc000\u2aad\ufe00\u0180abr\u2515\u2519\u251drr;\u690crk;\u6772\u0100ak\u2522\u252cc\u0100ek\u2528\u252a;\u407b;\u405b\u0100es\u2531\u2533;\u698bl\u0100du\u2539\u253b;\u698f;\u698d\u0200aeuy\u2546\u254b\u2556\u2558ron;\u413e\u0100di\u2550\u2554il;\u413c\xec\u08b0\xe2\u2529;\u443b\u0200cqrs\u2563\u2566\u256d\u257da;\u6936uo\u0100;r\u0e19\u1746\u0100du\u2572\u2577har;\u6967shar;\u694bh;\u61b2\u0280;fgqs\u258b\u258c\u0989\u25f3\u25ff\u6264t\u0280ahlrt\u2598\u25a4\u25b7\u25c2\u25e8rrow\u0100;t\u0899\u25a1a\xe9\u24f6arpoon\u0100du\u25af\u25b4own\xbb\u045ap\xbb\u0966eftarrows;\u61c7ight\u0180ahs\u25cd\u25d6\u25derrow\u0100;s\u08f4\u08a7arpoon\xf3\u0f98quigarro\xf7\u21f0hreetimes;\u62cb\u0180;qs\u258b\u0993\u25falan\xf4\u09ac\u0280;cdgs\u09ac\u260a\u260d\u261d\u2628c;\u6aa8ot\u0100;o\u2614\u2615\u6a7f\u0100;r\u261a\u261b\u6a81;\u6a83\u0100;e\u2622\u2625\uc000\u22da\ufe00s;\u6a93\u0280adegs\u2633\u2639\u263d\u2649\u264bppro\xf8\u24c6ot;\u62d6q\u0100gq\u2643\u2645\xf4\u0989gt\xf2\u248c\xf4\u099bi\xed\u09b2\u0180ilr\u2655\u08e1\u265asht;\u697c;\uc000\ud835\udd29\u0100;E\u099c\u2663;\u6a91\u0161\u2669\u2676r\u0100du\u25b2\u266e\u0100;l\u0965\u2673;\u696alk;\u6584cy;\u4459\u0280;acht\u0a48\u2688\u268b\u2691\u2696r\xf2\u25c1orne\xf2\u1d08ard;\u696bri;\u65fa\u0100io\u269f\u26a4dot;\u4140ust\u0100;a\u26ac\u26ad\u63b0che\xbb\u26ad\u0200Eaes\u26bb\u26bd\u26c9\u26d4;\u6268p\u0100;p\u26c3\u26c4\u6a89rox\xbb\u26c4\u0100;q\u26ce\u26cf\u6a87\u0100;q\u26ce\u26bbim;\u62e6\u0400abnoptwz\u26e9\u26f4\u26f7\u271a\u272f\u2741\u2747\u2750\u0100nr\u26ee\u26f1g;\u67ecr;\u61fdr\xeb\u08c1g\u0180lmr\u26ff\u270d\u2714eft\u0100ar\u09e6\u2707ight\xe1\u09f2apsto;\u67fcight\xe1\u09fdparrow\u0100lr\u2725\u2729ef\xf4\u24edight;\u61ac\u0180afl\u2736\u2739\u273dr;\u6985;\uc000\ud835\udd5dus;\u6a2dimes;\u6a34\u0161\u274b\u274fst;\u6217\xe1\u134e\u0180;ef\u2757\u2758\u1800\u65cange\xbb\u2758ar\u0100;l\u2764\u2765\u4028t;\u6993\u0280achmt\u2773\u2776\u277c\u2785\u2787r\xf2\u08a8orne\xf2\u1d8car\u0100;d\u0f98\u2783;\u696d;\u600eri;\u62bf\u0300achiqt\u2798\u279d\u0a40\u27a2\u27ae\u27bbquo;\u6039r;\uc000\ud835\udcc1m\u0180;eg\u09b2\u27aa\u27ac;\u6a8d;\u6a8f\u0100bu\u252a\u27b3o\u0100;r\u0e1f\u27b9;\u601arok;\u4142\u8400<;cdhilqr\u082b\u27d2\u2639\u27dc\u27e0\u27e5\u27ea\u27f0\u0100ci\u27d7\u27d9;\u6aa6r;\u6a79re\xe5\u25f2mes;\u62c9arr;\u6976uest;\u6a7b\u0100Pi\u27f5\u27f9ar;\u6996\u0180;ef\u2800\u092d\u181b\u65c3r\u0100du\u2807\u280dshar;\u694ahar;\u6966\u0100en\u2817\u2821rtneqq;\uc000\u2268\ufe00\xc5\u281e\u0700Dacdefhilnopsu\u2840\u2845\u2882\u288e\u2893\u28a0\u28a5\u28a8\u28da\u28e2\u28e4\u0a83\u28f3\u2902Dot;\u623a\u0200clpr\u284e\u2852\u2863\u287dr\u803b\xaf\u40af\u0100et\u2857\u2859;\u6642\u0100;e\u285e\u285f\u6720se\xbb\u285f\u0100;s\u103b\u2868to\u0200;dlu\u103b\u2873\u2877\u287bow\xee\u048cef\xf4\u090f\xf0\u13d1ker;\u65ae\u0100oy\u2887\u288cmma;\u6a29;\u443cash;\u6014asuredangle\xbb\u1626r;\uc000\ud835\udd2ao;\u6127\u0180cdn\u28af\u28b4\u28c9ro\u803b\xb5\u40b5\u0200;acd\u1464\u28bd\u28c0\u28c4s\xf4\u16a7ir;\u6af0ot\u80bb\xb7\u01b5us\u0180;bd\u28d2\u1903\u28d3\u6212\u0100;u\u1d3c\u28d8;\u6a2a\u0163\u28de\u28e1p;\u6adb\xf2\u2212\xf0\u0a81\u0100dp\u28e9\u28eeels;\u62a7f;\uc000\ud835\udd5e\u0100ct\u28f8\u28fdr;\uc000\ud835\udcc2pos\xbb\u159d\u0180;lm\u2909\u290a\u290d\u43bctimap;\u62b8\u0c00GLRVabcdefghijlmoprstuvw\u2942\u2953\u297e\u2989\u2998\u29da\u29e9\u2a15\u2a1a\u2a58\u2a5d\u2a83\u2a95\u2aa4\u2aa8\u2b04\u2b07\u2b44\u2b7f\u2bae\u2c34\u2c67\u2c7c\u2ce9\u0100gt\u2947\u294b;\uc000\u22d9\u0338\u0100;v\u2950\u0bcf\uc000\u226b\u20d2\u0180elt\u295a\u2972\u2976ft\u0100ar\u2961\u2967rrow;\u61cdightarrow;\u61ce;\uc000\u22d8\u0338\u0100;v\u297b\u0c47\uc000\u226a\u20d2ightarrow;\u61cf\u0100Dd\u298e\u2993ash;\u62afash;\u62ae\u0280bcnpt\u29a3\u29a7\u29ac\u29b1\u29ccla\xbb\u02deute;\u4144g;\uc000\u2220\u20d2\u0280;Eiop\u0d84\u29bc\u29c0\u29c5\u29c8;\uc000\u2a70\u0338d;\uc000\u224b\u0338s;\u4149ro\xf8\u0d84ur\u0100;a\u29d3\u29d4\u666el\u0100;s\u29d3\u0b38\u01f3\u29df\0\u29e3p\u80bb\xa0\u0b37mp\u0100;e\u0bf9\u0c00\u0280aeouy\u29f4\u29fe\u2a03\u2a10\u2a13\u01f0\u29f9\0\u29fb;\u6a43on;\u4148dil;\u4146ng\u0100;d\u0d7e\u2a0aot;\uc000\u2a6d\u0338p;\u6a42;\u443dash;\u6013\u0380;Aadqsx\u0b92\u2a29\u2a2d\u2a3b\u2a41\u2a45\u2a50rr;\u61d7r\u0100hr\u2a33\u2a36k;\u6924\u0100;o\u13f2\u13f0ot;\uc000\u2250\u0338ui\xf6\u0b63\u0100ei\u2a4a\u2a4ear;\u6928\xed\u0b98ist\u0100;s\u0ba0\u0b9fr;\uc000\ud835\udd2b\u0200Eest\u0bc5\u2a66\u2a79\u2a7c\u0180;qs\u0bbc\u2a6d\u0be1\u0180;qs\u0bbc\u0bc5\u2a74lan\xf4\u0be2i\xed\u0bea\u0100;r\u0bb6\u2a81\xbb\u0bb7\u0180Aap\u2a8a\u2a8d\u2a91r\xf2\u2971rr;\u61aear;\u6af2\u0180;sv\u0f8d\u2a9c\u0f8c\u0100;d\u2aa1\u2aa2\u62fc;\u62facy;\u445a\u0380AEadest\u2ab7\u2aba\u2abe\u2ac2\u2ac5\u2af6\u2af9r\xf2\u2966;\uc000\u2266\u0338rr;\u619ar;\u6025\u0200;fqs\u0c3b\u2ace\u2ae3\u2aeft\u0100ar\u2ad4\u2ad9rro\xf7\u2ac1ightarro\xf7\u2a90\u0180;qs\u0c3b\u2aba\u2aealan\xf4\u0c55\u0100;s\u0c55\u2af4\xbb\u0c36i\xed\u0c5d\u0100;r\u0c35\u2afei\u0100;e\u0c1a\u0c25i\xe4\u0d90\u0100pt\u2b0c\u2b11f;\uc000\ud835\udd5f\u8180\xac;in\u2b19\u2b1a\u2b36\u40acn\u0200;Edv\u0b89\u2b24\u2b28\u2b2e;\uc000\u22f9\u0338ot;\uc000\u22f5\u0338\u01e1\u0b89\u2b33\u2b35;\u62f7;\u62f6i\u0100;v\u0cb8\u2b3c\u01e1\u0cb8\u2b41\u2b43;\u62fe;\u62fd\u0180aor\u2b4b\u2b63\u2b69r\u0200;ast\u0b7b\u2b55\u2b5a\u2b5flle\xec\u0b7bl;\uc000\u2afd\u20e5;\uc000\u2202\u0338lint;\u6a14\u0180;ce\u0c92\u2b70\u2b73u\xe5\u0ca5\u0100;c\u0c98\u2b78\u0100;e\u0c92\u2b7d\xf1\u0c98\u0200Aait\u2b88\u2b8b\u2b9d\u2ba7r\xf2\u2988rr\u0180;cw\u2b94\u2b95\u2b99\u619b;\uc000\u2933\u0338;\uc000\u219d\u0338ghtarrow\xbb\u2b95ri\u0100;e\u0ccb\u0cd6\u0380chimpqu\u2bbd\u2bcd\u2bd9\u2b04\u0b78\u2be4\u2bef\u0200;cer\u0d32\u2bc6\u0d37\u2bc9u\xe5\u0d45;\uc000\ud835\udcc3ort\u026d\u2b05\0\0\u2bd6ar\xe1\u2b56m\u0100;e\u0d6e\u2bdf\u0100;q\u0d74\u0d73su\u0100bp\u2beb\u2bed\xe5\u0cf8\xe5\u0d0b\u0180bcp\u2bf6\u2c11\u2c19\u0200;Ees\u2bff\u2c00\u0d22\u2c04\u6284;\uc000\u2ac5\u0338et\u0100;e\u0d1b\u2c0bq\u0100;q\u0d23\u2c00c\u0100;e\u0d32\u2c17\xf1\u0d38\u0200;Ees\u2c22\u2c23\u0d5f\u2c27\u6285;\uc000\u2ac6\u0338et\u0100;e\u0d58\u2c2eq\u0100;q\u0d60\u2c23\u0200gilr\u2c3d\u2c3f\u2c45\u2c47\xec\u0bd7lde\u803b\xf1\u40f1\xe7\u0c43iangle\u0100lr\u2c52\u2c5ceft\u0100;e\u0c1a\u2c5a\xf1\u0c26ight\u0100;e\u0ccb\u2c65\xf1\u0cd7\u0100;m\u2c6c\u2c6d\u43bd\u0180;es\u2c74\u2c75\u2c79\u4023ro;\u6116p;\u6007\u0480DHadgilrs\u2c8f\u2c94\u2c99\u2c9e\u2ca3\u2cb0\u2cb6\u2cd3\u2ce3ash;\u62adarr;\u6904p;\uc000\u224d\u20d2ash;\u62ac\u0100et\u2ca8\u2cac;\uc000\u2265\u20d2;\uc000>\u20d2nfin;\u69de\u0180Aet\u2cbd\u2cc1\u2cc5rr;\u6902;\uc000\u2264\u20d2\u0100;r\u2cca\u2ccd\uc000<\u20d2ie;\uc000\u22b4\u20d2\u0100At\u2cd8\u2cdcrr;\u6903rie;\uc000\u22b5\u20d2im;\uc000\u223c\u20d2\u0180Aan\u2cf0\u2cf4\u2d02rr;\u61d6r\u0100hr\u2cfa\u2cfdk;\u6923\u0100;o\u13e7\u13e5ear;\u6927\u1253\u1a95\0\0\0\0\0\0\0\0\0\0\0\0\0\u2d2d\0\u2d38\u2d48\u2d60\u2d65\u2d72\u2d84\u1b07\0\0\u2d8d\u2dab\0\u2dc8\u2dce\0\u2ddc\u2e19\u2e2b\u2e3e\u2e43\u0100cs\u2d31\u1a97ute\u803b\xf3\u40f3\u0100iy\u2d3c\u2d45r\u0100;c\u1a9e\u2d42\u803b\xf4\u40f4;\u443e\u0280abios\u1aa0\u2d52\u2d57\u01c8\u2d5alac;\u4151v;\u6a38old;\u69bclig;\u4153\u0100cr\u2d69\u2d6dir;\u69bf;\uc000\ud835\udd2c\u036f\u2d79\0\0\u2d7c\0\u2d82n;\u42dbave\u803b\xf2\u40f2;\u69c1\u0100bm\u2d88\u0df4ar;\u69b5\u0200acit\u2d95\u2d98\u2da5\u2da8r\xf2\u1a80\u0100ir\u2d9d\u2da0r;\u69beoss;\u69bbn\xe5\u0e52;\u69c0\u0180aei\u2db1\u2db5\u2db9cr;\u414dga;\u43c9\u0180cdn\u2dc0\u2dc5\u01cdron;\u43bf;\u69b6pf;\uc000\ud835\udd60\u0180ael\u2dd4\u2dd7\u01d2r;\u69b7rp;\u69b9\u0380;adiosv\u2dea\u2deb\u2dee\u2e08\u2e0d\u2e10\u2e16\u6228r\xf2\u1a86\u0200;efm\u2df7\u2df8\u2e02\u2e05\u6a5dr\u0100;o\u2dfe\u2dff\u6134f\xbb\u2dff\u803b\xaa\u40aa\u803b\xba\u40bagof;\u62b6r;\u6a56lope;\u6a57;\u6a5b\u0180clo\u2e1f\u2e21\u2e27\xf2\u2e01ash\u803b\xf8\u40f8l;\u6298i\u016c\u2e2f\u2e34de\u803b\xf5\u40f5es\u0100;a\u01db\u2e3as;\u6a36ml\u803b\xf6\u40f6bar;\u633d\u0ae1\u2e5e\0\u2e7d\0\u2e80\u2e9d\0\u2ea2\u2eb9\0\0\u2ecb\u0e9c\0\u2f13\0\0\u2f2b\u2fbc\0\u2fc8r\u0200;ast\u0403\u2e67\u2e72\u0e85\u8100\xb6;l\u2e6d\u2e6e\u40b6le\xec\u0403\u0269\u2e78\0\0\u2e7bm;\u6af3;\u6afdy;\u443fr\u0280cimpt\u2e8b\u2e8f\u2e93\u1865\u2e97nt;\u4025od;\u402eil;\u6030enk;\u6031r;\uc000\ud835\udd2d\u0180imo\u2ea8\u2eb0\u2eb4\u0100;v\u2ead\u2eae\u43c6;\u43d5ma\xf4\u0a76ne;\u660e\u0180;tv\u2ebf\u2ec0\u2ec8\u43c0chfork\xbb\u1ffd;\u43d6\u0100au\u2ecf\u2edfn\u0100ck\u2ed5\u2eddk\u0100;h\u21f4\u2edb;\u610e\xf6\u21f4s\u0480;abcdemst\u2ef3\u2ef4\u1908\u2ef9\u2efd\u2f04\u2f06\u2f0a\u2f0e\u402bcir;\u6a23ir;\u6a22\u0100ou\u1d40\u2f02;\u6a25;\u6a72n\u80bb\xb1\u0e9dim;\u6a26wo;\u6a27\u0180ipu\u2f19\u2f20\u2f25ntint;\u6a15f;\uc000\ud835\udd61nd\u803b\xa3\u40a3\u0500;Eaceinosu\u0ec8\u2f3f\u2f41\u2f44\u2f47\u2f81\u2f89\u2f92\u2f7e\u2fb6;\u6ab3p;\u6ab7u\xe5\u0ed9\u0100;c\u0ece\u2f4c\u0300;acens\u0ec8\u2f59\u2f5f\u2f66\u2f68\u2f7eppro\xf8\u2f43urlye\xf1\u0ed9\xf1\u0ece\u0180aes\u2f6f\u2f76\u2f7approx;\u6ab9qq;\u6ab5im;\u62e8i\xed\u0edfme\u0100;s\u2f88\u0eae\u6032\u0180Eas\u2f78\u2f90\u2f7a\xf0\u2f75\u0180dfp\u0eec\u2f99\u2faf\u0180als\u2fa0\u2fa5\u2faalar;\u632eine;\u6312urf;\u6313\u0100;t\u0efb\u2fb4\xef\u0efbrel;\u62b0\u0100ci\u2fc0\u2fc5r;\uc000\ud835\udcc5;\u43c8ncsp;\u6008\u0300fiopsu\u2fda\u22e2\u2fdf\u2fe5\u2feb\u2ff1r;\uc000\ud835\udd2epf;\uc000\ud835\udd62rime;\u6057cr;\uc000\ud835\udcc6\u0180aeo\u2ff8\u3009\u3013t\u0100ei\u2ffe\u3005rnion\xf3\u06b0nt;\u6a16st\u0100;e\u3010\u3011\u403f\xf1\u1f19\xf4\u0f14\u0a80ABHabcdefhilmnoprstux\u3040\u3051\u3055\u3059\u30e0\u310e\u312b\u3147\u3162\u3172\u318e\u3206\u3215\u3224\u3229\u3258\u326e\u3272\u3290\u32b0\u32b7\u0180art\u3047\u304a\u304cr\xf2\u10b3\xf2\u03ddail;\u691car\xf2\u1c65ar;\u6964\u0380cdenqrt\u3068\u3075\u3078\u307f\u308f\u3094\u30cc\u0100eu\u306d\u3071;\uc000\u223d\u0331te;\u4155i\xe3\u116emptyv;\u69b3g\u0200;del\u0fd1\u3089\u308b\u308d;\u6992;\u69a5\xe5\u0fd1uo\u803b\xbb\u40bbr\u0580;abcfhlpstw\u0fdc\u30ac\u30af\u30b7\u30b9\u30bc\u30be\u30c0\u30c3\u30c7\u30cap;\u6975\u0100;f\u0fe0\u30b4s;\u6920;\u6933s;\u691e\xeb\u225d\xf0\u272el;\u6945im;\u6974l;\u61a3;\u619d\u0100ai\u30d1\u30d5il;\u691ao\u0100;n\u30db\u30dc\u6236al\xf3\u0f1e\u0180abr\u30e7\u30ea\u30eer\xf2\u17e5rk;\u6773\u0100ak\u30f3\u30fdc\u0100ek\u30f9\u30fb;\u407d;\u405d\u0100es\u3102\u3104;\u698cl\u0100du\u310a\u310c;\u698e;\u6990\u0200aeuy\u3117\u311c\u3127\u3129ron;\u4159\u0100di\u3121\u3125il;\u4157\xec\u0ff2\xe2\u30fa;\u4440\u0200clqs\u3134\u3137\u313d\u3144a;\u6937dhar;\u6969uo\u0100;r\u020e\u020dh;\u61b3\u0180acg\u314e\u315f\u0f44l\u0200;ips\u0f78\u3158\u315b\u109cn\xe5\u10bbar\xf4\u0fa9t;\u65ad\u0180ilr\u3169\u1023\u316esht;\u697d;\uc000\ud835\udd2f\u0100ao\u3177\u3186r\u0100du\u317d\u317f\xbb\u047b\u0100;l\u1091\u3184;\u696c\u0100;v\u318b\u318c\u43c1;\u43f1\u0180gns\u3195\u31f9\u31fcht\u0300ahlrst\u31a4\u31b0\u31c2\u31d8\u31e4\u31eerrow\u0100;t\u0fdc\u31ada\xe9\u30c8arpoon\u0100du\u31bb\u31bfow\xee\u317ep\xbb\u1092eft\u0100ah\u31ca\u31d0rrow\xf3\u0feaarpoon\xf3\u0551ightarrows;\u61c9quigarro\xf7\u30cbhreetimes;\u62ccg;\u42daingdotse\xf1\u1f32\u0180ahm\u320d\u3210\u3213r\xf2\u0feaa\xf2\u0551;\u600foust\u0100;a\u321e\u321f\u63b1che\xbb\u321fmid;\u6aee\u0200abpt\u3232\u323d\u3240\u3252\u0100nr\u3237\u323ag;\u67edr;\u61fer\xeb\u1003\u0180afl\u3247\u324a\u324er;\u6986;\uc000\ud835\udd63us;\u6a2eimes;\u6a35\u0100ap\u325d\u3267r\u0100;g\u3263\u3264\u4029t;\u6994olint;\u6a12ar\xf2\u31e3\u0200achq\u327b\u3280\u10bc\u3285quo;\u603ar;\uc000\ud835\udcc7\u0100bu\u30fb\u328ao\u0100;r\u0214\u0213\u0180hir\u3297\u329b\u32a0re\xe5\u31f8mes;\u62cai\u0200;efl\u32aa\u1059\u1821\u32ab\u65b9tri;\u69celuhar;\u6968;\u611e\u0d61\u32d5\u32db\u32df\u332c\u3338\u3371\0\u337a\u33a4\0\0\u33ec\u33f0\0\u3428\u3448\u345a\u34ad\u34b1\u34ca\u34f1\0\u3616\0\0\u3633cute;\u415bqu\xef\u27ba\u0500;Eaceinpsy\u11ed\u32f3\u32f5\u32ff\u3302\u330b\u330f\u331f\u3326\u3329;\u6ab4\u01f0\u32fa\0\u32fc;\u6ab8on;\u4161u\xe5\u11fe\u0100;d\u11f3\u3307il;\u415frc;\u415d\u0180Eas\u3316\u3318\u331b;\u6ab6p;\u6abaim;\u62e9olint;\u6a13i\xed\u1204;\u4441ot\u0180;be\u3334\u1d47\u3335\u62c5;\u6a66\u0380Aacmstx\u3346\u334a\u3357\u335b\u335e\u3363\u336drr;\u61d8r\u0100hr\u3350\u3352\xeb\u2228\u0100;o\u0a36\u0a34t\u803b\xa7\u40a7i;\u403bwar;\u6929m\u0100in\u3369\xf0nu\xf3\xf1t;\u6736r\u0100;o\u3376\u2055\uc000\ud835\udd30\u0200acoy\u3382\u3386\u3391\u33a0rp;\u666f\u0100hy\u338b\u338fcy;\u4449;\u4448rt\u026d\u3399\0\0\u339ci\xe4\u1464ara\xec\u2e6f\u803b\xad\u40ad\u0100gm\u33a8\u33b4ma\u0180;fv\u33b1\u33b2\u33b2\u43c3;\u43c2\u0400;deglnpr\u12ab\u33c5\u33c9\u33ce\u33d6\u33de\u33e1\u33e6ot;\u6a6a\u0100;q\u12b1\u12b0\u0100;E\u33d3\u33d4\u6a9e;\u6aa0\u0100;E\u33db\u33dc\u6a9d;\u6a9fe;\u6246lus;\u6a24arr;\u6972ar\xf2\u113d\u0200aeit\u33f8\u3408\u340f\u3417\u0100ls\u33fd\u3404lsetm\xe9\u336ahp;\u6a33parsl;\u69e4\u0100dl\u1463\u3414e;\u6323\u0100;e\u341c\u341d\u6aaa\u0100;s\u3422\u3423\u6aac;\uc000\u2aac\ufe00\u0180flp\u342e\u3433\u3442tcy;\u444c\u0100;b\u3438\u3439\u402f\u0100;a\u343e\u343f\u69c4r;\u633ff;\uc000\ud835\udd64a\u0100dr\u344d\u0402es\u0100;u\u3454\u3455\u6660it\xbb\u3455\u0180csu\u3460\u3479\u349f\u0100au\u3465\u346fp\u0100;s\u1188\u346b;\uc000\u2293\ufe00p\u0100;s\u11b4\u3475;\uc000\u2294\ufe00u\u0100bp\u347f\u348f\u0180;es\u1197\u119c\u3486et\u0100;e\u1197\u348d\xf1\u119d\u0180;es\u11a8\u11ad\u3496et\u0100;e\u11a8\u349d\xf1\u11ae\u0180;af\u117b\u34a6\u05b0r\u0165\u34ab\u05b1\xbb\u117car\xf2\u1148\u0200cemt\u34b9\u34be\u34c2\u34c5r;\uc000\ud835\udcc8tm\xee\xf1i\xec\u3415ar\xe6\u11be\u0100ar\u34ce\u34d5r\u0100;f\u34d4\u17bf\u6606\u0100an\u34da\u34edight\u0100ep\u34e3\u34eapsilo\xee\u1ee0h\xe9\u2eafs\xbb\u2852\u0280bcmnp\u34fb\u355e\u1209\u358b\u358e\u0480;Edemnprs\u350e\u350f\u3511\u3515\u351e\u3523\u352c\u3531\u3536\u6282;\u6ac5ot;\u6abd\u0100;d\u11da\u351aot;\u6ac3ult;\u6ac1\u0100Ee\u3528\u352a;\u6acb;\u628alus;\u6abfarr;\u6979\u0180eiu\u353d\u3552\u3555t\u0180;en\u350e\u3545\u354bq\u0100;q\u11da\u350feq\u0100;q\u352b\u3528m;\u6ac7\u0100bp\u355a\u355c;\u6ad5;\u6ad3c\u0300;acens\u11ed\u356c\u3572\u3579\u357b\u3326ppro\xf8\u32faurlye\xf1\u11fe\xf1\u11f3\u0180aes\u3582\u3588\u331bppro\xf8\u331aq\xf1\u3317g;\u666a\u0680123;Edehlmnps\u35a9\u35ac\u35af\u121c\u35b2\u35b4\u35c0\u35c9\u35d5\u35da\u35df\u35e8\u35ed\u803b\xb9\u40b9\u803b\xb2\u40b2\u803b\xb3\u40b3;\u6ac6\u0100os\u35b9\u35bct;\u6abeub;\u6ad8\u0100;d\u1222\u35c5ot;\u6ac4s\u0100ou\u35cf\u35d2l;\u67c9b;\u6ad7arr;\u697bult;\u6ac2\u0100Ee\u35e4\u35e6;\u6acc;\u628blus;\u6ac0\u0180eiu\u35f4\u3609\u360ct\u0180;en\u121c\u35fc\u3602q\u0100;q\u1222\u35b2eq\u0100;q\u35e7\u35e4m;\u6ac8\u0100bp\u3611\u3613;\u6ad4;\u6ad6\u0180Aan\u361c\u3620\u362drr;\u61d9r\u0100hr\u3626\u3628\xeb\u222e\u0100;o\u0a2b\u0a29war;\u692alig\u803b\xdf\u40df\u0be1\u3651\u365d\u3660\u12ce\u3673\u3679\0\u367e\u36c2\0\0\0\0\0\u36db\u3703\0\u3709\u376c\0\0\0\u3787\u0272\u3656\0\0\u365bget;\u6316;\u43c4r\xeb\u0e5f\u0180aey\u3666\u366b\u3670ron;\u4165dil;\u4163;\u4442lrec;\u6315r;\uc000\ud835\udd31\u0200eiko\u3686\u369d\u36b5\u36bc\u01f2\u368b\0\u3691e\u01004f\u1284\u1281a\u0180;sv\u3698\u3699\u369b\u43b8ym;\u43d1\u0100cn\u36a2\u36b2k\u0100as\u36a8\u36aeppro\xf8\u12c1im\xbb\u12acs\xf0\u129e\u0100as\u36ba\u36ae\xf0\u12c1rn\u803b\xfe\u40fe\u01ec\u031f\u36c6\u22e7es\u8180\xd7;bd\u36cf\u36d0\u36d8\u40d7\u0100;a\u190f\u36d5r;\u6a31;\u6a30\u0180eps\u36e1\u36e3\u3700\xe1\u2a4d\u0200;bcf\u0486\u36ec\u36f0\u36f4ot;\u6336ir;\u6af1\u0100;o\u36f9\u36fc\uc000\ud835\udd65rk;\u6ada\xe1\u3362rime;\u6034\u0180aip\u370f\u3712\u3764d\xe5\u1248\u0380adempst\u3721\u374d\u3740\u3751\u3757\u375c\u375fngle\u0280;dlqr\u3730\u3731\u3736\u3740\u3742\u65b5own\xbb\u1dbbeft\u0100;e\u2800\u373e\xf1\u092e;\u625cight\u0100;e\u32aa\u374b\xf1\u105aot;\u65ecinus;\u6a3alus;\u6a39b;\u69cdime;\u6a3bezium;\u63e2\u0180cht\u3772\u377d\u3781\u0100ry\u3777\u377b;\uc000\ud835\udcc9;\u4446cy;\u445brok;\u4167\u0100io\u378b\u378ex\xf4\u1777head\u0100lr\u3797\u37a0eftarro\xf7\u084fightarrow\xbb\u0f5d\u0900AHabcdfghlmoprstuw\u37d0\u37d3\u37d7\u37e4\u37f0\u37fc\u380e\u381c\u3823\u3834\u3851\u385d\u386b\u38a9\u38cc\u38d2\u38ea\u38f6r\xf2\u03edar;\u6963\u0100cr\u37dc\u37e2ute\u803b\xfa\u40fa\xf2\u1150r\u01e3\u37ea\0\u37edy;\u445eve;\u416d\u0100iy\u37f5\u37farc\u803b\xfb\u40fb;\u4443\u0180abh\u3803\u3806\u380br\xf2\u13adlac;\u4171a\xf2\u13c3\u0100ir\u3813\u3818sht;\u697e;\uc000\ud835\udd32rave\u803b\xf9\u40f9\u0161\u3827\u3831r\u0100lr\u382c\u382e\xbb\u0957\xbb\u1083lk;\u6580\u0100ct\u3839\u384d\u026f\u383f\0\0\u384arn\u0100;e\u3845\u3846\u631cr\xbb\u3846op;\u630fri;\u65f8\u0100al\u3856\u385acr;\u416b\u80bb\xa8\u0349\u0100gp\u3862\u3866on;\u4173f;\uc000\ud835\udd66\u0300adhlsu\u114b\u3878\u387d\u1372\u3891\u38a0own\xe1\u13b3arpoon\u0100lr\u3888\u388cef\xf4\u382digh\xf4\u382fi\u0180;hl\u3899\u389a\u389c\u43c5\xbb\u13faon\xbb\u389aparrows;\u61c8\u0180cit\u38b0\u38c4\u38c8\u026f\u38b6\0\0\u38c1rn\u0100;e\u38bc\u38bd\u631dr\xbb\u38bdop;\u630eng;\u416fri;\u65f9cr;\uc000\ud835\udcca\u0180dir\u38d9\u38dd\u38e2ot;\u62f0lde;\u4169i\u0100;f\u3730\u38e8\xbb\u1813\u0100am\u38ef\u38f2r\xf2\u38a8l\u803b\xfc\u40fcangle;\u69a7\u0780ABDacdeflnoprsz\u391c\u391f\u3929\u392d\u39b5\u39b8\u39bd\u39df\u39e4\u39e8\u39f3\u39f9\u39fd\u3a01\u3a20r\xf2\u03f7ar\u0100;v\u3926\u3927\u6ae8;\u6ae9as\xe8\u03e1\u0100nr\u3932\u3937grt;\u699c\u0380eknprst\u34e3\u3946\u394b\u3952\u395d\u3964\u3996app\xe1\u2415othin\xe7\u1e96\u0180hir\u34eb\u2ec8\u3959op\xf4\u2fb5\u0100;h\u13b7\u3962\xef\u318d\u0100iu\u3969\u396dgm\xe1\u33b3\u0100bp\u3972\u3984setneq\u0100;q\u397d\u3980\uc000\u228a\ufe00;\uc000\u2acb\ufe00setneq\u0100;q\u398f\u3992\uc000\u228b\ufe00;\uc000\u2acc\ufe00\u0100hr\u399b\u399fet\xe1\u369ciangle\u0100lr\u39aa\u39afeft\xbb\u0925ight\xbb\u1051y;\u4432ash\xbb\u1036\u0180elr\u39c4\u39d2\u39d7\u0180;be\u2dea\u39cb\u39cfar;\u62bbq;\u625alip;\u62ee\u0100bt\u39dc\u1468a\xf2\u1469r;\uc000\ud835\udd33tr\xe9\u39aesu\u0100bp\u39ef\u39f1\xbb\u0d1c\xbb\u0d59pf;\uc000\ud835\udd67ro\xf0\u0efbtr\xe9\u39b4\u0100cu\u3a06\u3a0br;\uc000\ud835\udccb\u0100bp\u3a10\u3a18n\u0100Ee\u3980\u3a16\xbb\u397en\u0100Ee\u3992\u3a1e\xbb\u3990igzag;\u699a\u0380cefoprs\u3a36\u3a3b\u3a56\u3a5b\u3a54\u3a61\u3a6airc;\u4175\u0100di\u3a40\u3a51\u0100bg\u3a45\u3a49ar;\u6a5fe\u0100;q\u15fa\u3a4f;\u6259erp;\u6118r;\uc000\ud835\udd34pf;\uc000\ud835\udd68\u0100;e\u1479\u3a66at\xe8\u1479cr;\uc000\ud835\udccc\u0ae3\u178e\u3a87\0\u3a8b\0\u3a90\u3a9b\0\0\u3a9d\u3aa8\u3aab\u3aaf\0\0\u3ac3\u3ace\0\u3ad8\u17dc\u17dftr\xe9\u17d1r;\uc000\ud835\udd35\u0100Aa\u3a94\u3a97r\xf2\u03c3r\xf2\u09f6;\u43be\u0100Aa\u3aa1\u3aa4r\xf2\u03b8r\xf2\u09eba\xf0\u2713is;\u62fb\u0180dpt\u17a4\u3ab5\u3abe\u0100fl\u3aba\u17a9;\uc000\ud835\udd69im\xe5\u17b2\u0100Aa\u3ac7\u3acar\xf2\u03cer\xf2\u0a01\u0100cq\u3ad2\u17b8r;\uc000\ud835\udccd\u0100pt\u17d6\u3adcr\xe9\u17d4\u0400acefiosu\u3af0\u3afd\u3b08\u3b0c\u3b11\u3b15\u3b1b\u3b21c\u0100uy\u3af6\u3afbte\u803b\xfd\u40fd;\u444f\u0100iy\u3b02\u3b06rc;\u4177;\u444bn\u803b\xa5\u40a5r;\uc000\ud835\udd36cy;\u4457pf;\uc000\ud835\udd6acr;\uc000\ud835\udcce\u0100cm\u3b26\u3b29y;\u444el\u803b\xff\u40ff\u0500acdefhiosw\u3b42\u3b48\u3b54\u3b58\u3b64\u3b69\u3b6d\u3b74\u3b7a\u3b80cute;\u417a\u0100ay\u3b4d\u3b52ron;\u417e;\u4437ot;\u417c\u0100et\u3b5d\u3b61tr\xe6\u155fa;\u43b6r;\uc000\ud835\udd37cy;\u4436grarr;\u61ddpf;\uc000\ud835\udd6bcr;\uc000\ud835\udccf\u0100jn\u3b85\u3b87;\u600dj;\u600c"
    .split("")
    .map((c) => c.charCodeAt(0)));

// Adapted from https://github.com/mathiasbynens/he/blob/36afe179392226cf1b6ccdb16ebbb7a5a844d93a/src/he.js#L106-L134
const decodeMap = new Map([
    [0, 65533],
    // C1 Unicode control character reference replacements
    [128, 8364],
    [130, 8218],
    [131, 402],
    [132, 8222],
    [133, 8230],
    [134, 8224],
    [135, 8225],
    [136, 710],
    [137, 8240],
    [138, 352],
    [139, 8249],
    [140, 338],
    [142, 381],
    [145, 8216],
    [146, 8217],
    [147, 8220],
    [148, 8221],
    [149, 8226],
    [150, 8211],
    [151, 8212],
    [152, 732],
    [153, 8482],
    [154, 353],
    [155, 8250],
    [156, 339],
    [158, 382],
    [159, 376],
]);
/**
 * Replace the given code point with a replacement character if it is a
 * surrogate or is outside the valid range. Otherwise return the code
 * point unchanged.
 */
function replaceCodePoint(codePoint) {
    var _a;
    if ((codePoint >= 55296 && codePoint <= 57343) ||
        codePoint > 1114111) {
        return 65533;
    }
    return (_a = decodeMap.get(codePoint)) !== null && _a !== void 0 ? _a : codePoint;
}

var CharCodes;
(function (CharCodes) {
    CharCodes[CharCodes["NUM"] = 35] = "NUM";
    CharCodes[CharCodes["SEMI"] = 59] = "SEMI";
    CharCodes[CharCodes["EQUALS"] = 61] = "EQUALS";
    CharCodes[CharCodes["ZERO"] = 48] = "ZERO";
    CharCodes[CharCodes["NINE"] = 57] = "NINE";
    CharCodes[CharCodes["LOWER_A"] = 97] = "LOWER_A";
    CharCodes[CharCodes["LOWER_F"] = 102] = "LOWER_F";
    CharCodes[CharCodes["LOWER_X"] = 120] = "LOWER_X";
    CharCodes[CharCodes["LOWER_Z"] = 122] = "LOWER_Z";
    CharCodes[CharCodes["UPPER_A"] = 65] = "UPPER_A";
    CharCodes[CharCodes["UPPER_F"] = 70] = "UPPER_F";
    CharCodes[CharCodes["UPPER_Z"] = 90] = "UPPER_Z";
})(CharCodes || (CharCodes = {}));
/** Bit that needs to be set to convert an upper case ASCII character to lower case */
const TO_LOWER_BIT = 32;
var BinTrieFlags;
(function (BinTrieFlags) {
    BinTrieFlags[BinTrieFlags["VALUE_LENGTH"] = 49152] = "VALUE_LENGTH";
    BinTrieFlags[BinTrieFlags["BRANCH_LENGTH"] = 16256] = "BRANCH_LENGTH";
    BinTrieFlags[BinTrieFlags["JUMP_TABLE"] = 127] = "JUMP_TABLE";
})(BinTrieFlags || (BinTrieFlags = {}));
function isNumber(code) {
    return code >= CharCodes.ZERO && code <= CharCodes.NINE;
}
function isHexadecimalCharacter(code) {
    return ((code >= CharCodes.UPPER_A && code <= CharCodes.UPPER_F) ||
        (code >= CharCodes.LOWER_A && code <= CharCodes.LOWER_F));
}
function isAsciiAlphaNumeric$1(code) {
    return ((code >= CharCodes.UPPER_A && code <= CharCodes.UPPER_Z) ||
        (code >= CharCodes.LOWER_A && code <= CharCodes.LOWER_Z) ||
        isNumber(code));
}
/**
 * Checks if the given character is a valid end character for an entity in an attribute.
 *
 * Attribute values that aren't terminated properly aren't parsed, and shouldn't lead to a parser error.
 * See the example in https://html.spec.whatwg.org/multipage/parsing.html#named-character-reference-state
 */
function isEntityInAttributeInvalidEnd(code) {
    return code === CharCodes.EQUALS || isAsciiAlphaNumeric$1(code);
}
var EntityDecoderState;
(function (EntityDecoderState) {
    EntityDecoderState[EntityDecoderState["EntityStart"] = 0] = "EntityStart";
    EntityDecoderState[EntityDecoderState["NumericStart"] = 1] = "NumericStart";
    EntityDecoderState[EntityDecoderState["NumericDecimal"] = 2] = "NumericDecimal";
    EntityDecoderState[EntityDecoderState["NumericHex"] = 3] = "NumericHex";
    EntityDecoderState[EntityDecoderState["NamedEntity"] = 4] = "NamedEntity";
})(EntityDecoderState || (EntityDecoderState = {}));
var DecodingMode;
(function (DecodingMode) {
    /** Entities in text nodes that can end with any character. */
    DecodingMode[DecodingMode["Legacy"] = 0] = "Legacy";
    /** Only allow entities terminated with a semicolon. */
    DecodingMode[DecodingMode["Strict"] = 1] = "Strict";
    /** Entities in attributes have limitations on ending characters. */
    DecodingMode[DecodingMode["Attribute"] = 2] = "Attribute";
})(DecodingMode || (DecodingMode = {}));
/**
 * Token decoder with support of writing partial entities.
 */
class EntityDecoder {
    constructor(
    /** The tree used to decode entities. */
    decodeTree, 
    /**
     * The function that is called when a codepoint is decoded.
     *
     * For multi-byte named entities, this will be called multiple times,
     * with the second codepoint, and the same `consumed` value.
     *
     * @param codepoint The decoded codepoint.
     * @param consumed The number of bytes consumed by the decoder.
     */
    emitCodePoint, 
    /** An object that is used to produce errors. */
    errors) {
        this.decodeTree = decodeTree;
        this.emitCodePoint = emitCodePoint;
        this.errors = errors;
        /** The current state of the decoder. */
        this.state = EntityDecoderState.EntityStart;
        /** Characters that were consumed while parsing an entity. */
        this.consumed = 1;
        /**
         * The result of the entity.
         *
         * Either the result index of a numeric entity, or the codepoint of a
         * numeric entity.
         */
        this.result = 0;
        /** The current index in the decode tree. */
        this.treeIndex = 0;
        /** The number of characters that were consumed in excess. */
        this.excess = 1;
        /** The mode in which the decoder is operating. */
        this.decodeMode = DecodingMode.Strict;
    }
    /** Resets the instance to make it reusable. */
    startEntity(decodeMode) {
        this.decodeMode = decodeMode;
        this.state = EntityDecoderState.EntityStart;
        this.result = 0;
        this.treeIndex = 0;
        this.excess = 1;
        this.consumed = 1;
    }
    /**
     * Write an entity to the decoder. This can be called multiple times with partial entities.
     * If the entity is incomplete, the decoder will return -1.
     *
     * Mirrors the implementation of `getDecoder`, but with the ability to stop decoding if the
     * entity is incomplete, and resume when the next string is written.
     *
     * @param input The string containing the entity (or a continuation of the entity).
     * @param offset The offset at which the entity begins. Should be 0 if this is not the first call.
     * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
     */
    write(input, offset) {
        switch (this.state) {
            case EntityDecoderState.EntityStart: {
                if (input.charCodeAt(offset) === CharCodes.NUM) {
                    this.state = EntityDecoderState.NumericStart;
                    this.consumed += 1;
                    return this.stateNumericStart(input, offset + 1);
                }
                this.state = EntityDecoderState.NamedEntity;
                return this.stateNamedEntity(input, offset);
            }
            case EntityDecoderState.NumericStart: {
                return this.stateNumericStart(input, offset);
            }
            case EntityDecoderState.NumericDecimal: {
                return this.stateNumericDecimal(input, offset);
            }
            case EntityDecoderState.NumericHex: {
                return this.stateNumericHex(input, offset);
            }
            case EntityDecoderState.NamedEntity: {
                return this.stateNamedEntity(input, offset);
            }
        }
    }
    /**
     * Switches between the numeric decimal and hexadecimal states.
     *
     * Equivalent to the `Numeric character reference state` in the HTML spec.
     *
     * @param input The string containing the entity (or a continuation of the entity).
     * @param offset The current offset.
     * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
     */
    stateNumericStart(input, offset) {
        if (offset >= input.length) {
            return -1;
        }
        if ((input.charCodeAt(offset) | TO_LOWER_BIT) === CharCodes.LOWER_X) {
            this.state = EntityDecoderState.NumericHex;
            this.consumed += 1;
            return this.stateNumericHex(input, offset + 1);
        }
        this.state = EntityDecoderState.NumericDecimal;
        return this.stateNumericDecimal(input, offset);
    }
    addToNumericResult(input, start, end, base) {
        if (start !== end) {
            const digitCount = end - start;
            this.result =
                this.result * Math.pow(base, digitCount) +
                    Number.parseInt(input.substr(start, digitCount), base);
            this.consumed += digitCount;
        }
    }
    /**
     * Parses a hexadecimal numeric entity.
     *
     * Equivalent to the `Hexademical character reference state` in the HTML spec.
     *
     * @param input The string containing the entity (or a continuation of the entity).
     * @param offset The current offset.
     * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
     */
    stateNumericHex(input, offset) {
        const startIndex = offset;
        while (offset < input.length) {
            const char = input.charCodeAt(offset);
            if (isNumber(char) || isHexadecimalCharacter(char)) {
                offset += 1;
            }
            else {
                this.addToNumericResult(input, startIndex, offset, 16);
                return this.emitNumericEntity(char, 3);
            }
        }
        this.addToNumericResult(input, startIndex, offset, 16);
        return -1;
    }
    /**
     * Parses a decimal numeric entity.
     *
     * Equivalent to the `Decimal character reference state` in the HTML spec.
     *
     * @param input The string containing the entity (or a continuation of the entity).
     * @param offset The current offset.
     * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
     */
    stateNumericDecimal(input, offset) {
        const startIndex = offset;
        while (offset < input.length) {
            const char = input.charCodeAt(offset);
            if (isNumber(char)) {
                offset += 1;
            }
            else {
                this.addToNumericResult(input, startIndex, offset, 10);
                return this.emitNumericEntity(char, 2);
            }
        }
        this.addToNumericResult(input, startIndex, offset, 10);
        return -1;
    }
    /**
     * Validate and emit a numeric entity.
     *
     * Implements the logic from the `Hexademical character reference start
     * state` and `Numeric character reference end state` in the HTML spec.
     *
     * @param lastCp The last code point of the entity. Used to see if the
     *               entity was terminated with a semicolon.
     * @param expectedLength The minimum number of characters that should be
     *                       consumed. Used to validate that at least one digit
     *                       was consumed.
     * @returns The number of characters that were consumed.
     */
    emitNumericEntity(lastCp, expectedLength) {
        var _a;
        // Ensure we consumed at least one digit.
        if (this.consumed <= expectedLength) {
            (_a = this.errors) === null || _a === void 0 ? void 0 : _a.absenceOfDigitsInNumericCharacterReference(this.consumed);
            return 0;
        }
        // Figure out if this is a legit end of the entity
        if (lastCp === CharCodes.SEMI) {
            this.consumed += 1;
        }
        else if (this.decodeMode === DecodingMode.Strict) {
            return 0;
        }
        this.emitCodePoint(replaceCodePoint(this.result), this.consumed);
        if (this.errors) {
            if (lastCp !== CharCodes.SEMI) {
                this.errors.missingSemicolonAfterCharacterReference();
            }
            this.errors.validateNumericCharacterReference(this.result);
        }
        return this.consumed;
    }
    /**
     * Parses a named entity.
     *
     * Equivalent to the `Named character reference state` in the HTML spec.
     *
     * @param input The string containing the entity (or a continuation of the entity).
     * @param offset The current offset.
     * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
     */
    stateNamedEntity(input, offset) {
        const { decodeTree } = this;
        let current = decodeTree[this.treeIndex];
        // The mask is the number of bytes of the value, including the current byte.
        let valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
        for (; offset < input.length; offset++, this.excess++) {
            const char = input.charCodeAt(offset);
            this.treeIndex = determineBranch(decodeTree, current, this.treeIndex + Math.max(1, valueLength), char);
            if (this.treeIndex < 0) {
                return this.result === 0 ||
                    // If we are parsing an attribute
                    (this.decodeMode === DecodingMode.Attribute &&
                        // We shouldn't have consumed any characters after the entity,
                        (valueLength === 0 ||
                            // And there should be no invalid characters.
                            isEntityInAttributeInvalidEnd(char)))
                    ? 0
                    : this.emitNotTerminatedNamedEntity();
            }
            current = decodeTree[this.treeIndex];
            valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
            // If the branch is a value, store it and continue
            if (valueLength !== 0) {
                // If the entity is terminated by a semicolon, we are done.
                if (char === CharCodes.SEMI) {
                    return this.emitNamedEntityData(this.treeIndex, valueLength, this.consumed + this.excess);
                }
                // If we encounter a non-terminated (legacy) entity while parsing strictly, then ignore it.
                if (this.decodeMode !== DecodingMode.Strict) {
                    this.result = this.treeIndex;
                    this.consumed += this.excess;
                    this.excess = 0;
                }
            }
        }
        return -1;
    }
    /**
     * Emit a named entity that was not terminated with a semicolon.
     *
     * @returns The number of characters consumed.
     */
    emitNotTerminatedNamedEntity() {
        var _a;
        const { result, decodeTree } = this;
        const valueLength = (decodeTree[result] & BinTrieFlags.VALUE_LENGTH) >> 14;
        this.emitNamedEntityData(result, valueLength, this.consumed);
        (_a = this.errors) === null || _a === void 0 ? void 0 : _a.missingSemicolonAfterCharacterReference();
        return this.consumed;
    }
    /**
     * Emit a named entity.
     *
     * @param result The index of the entity in the decode tree.
     * @param valueLength The number of bytes in the entity.
     * @param consumed The number of characters consumed.
     *
     * @returns The number of characters consumed.
     */
    emitNamedEntityData(result, valueLength, consumed) {
        const { decodeTree } = this;
        this.emitCodePoint(valueLength === 1
            ? decodeTree[result] & ~BinTrieFlags.VALUE_LENGTH
            : decodeTree[result + 1], consumed);
        if (valueLength === 3) {
            // For multi-byte values, we need to emit the second byte.
            this.emitCodePoint(decodeTree[result + 2], consumed);
        }
        return consumed;
    }
    /**
     * Signal to the parser that the end of the input was reached.
     *
     * Remaining data will be emitted and relevant errors will be produced.
     *
     * @returns The number of characters consumed.
     */
    end() {
        var _a;
        switch (this.state) {
            case EntityDecoderState.NamedEntity: {
                // Emit a named entity if we have one.
                return this.result !== 0 &&
                    (this.decodeMode !== DecodingMode.Attribute ||
                        this.result === this.treeIndex)
                    ? this.emitNotTerminatedNamedEntity()
                    : 0;
            }
            // Otherwise, emit a numeric entity if we have one.
            case EntityDecoderState.NumericDecimal: {
                return this.emitNumericEntity(0, 2);
            }
            case EntityDecoderState.NumericHex: {
                return this.emitNumericEntity(0, 3);
            }
            case EntityDecoderState.NumericStart: {
                (_a = this.errors) === null || _a === void 0 ? void 0 : _a.absenceOfDigitsInNumericCharacterReference(this.consumed);
                return 0;
            }
            case EntityDecoderState.EntityStart: {
                // Return 0 if we have no entity.
                return 0;
            }
        }
    }
}
/**
 * Determines the branch of the current node that is taken given the current
 * character. This function is used to traverse the trie.
 *
 * @param decodeTree The trie.
 * @param current The current node.
 * @param nodeIdx The index right after the current node and its value.
 * @param char The current character.
 * @returns The index of the next node, or -1 if no branch is taken.
 */
function determineBranch(decodeTree, current, nodeIndex, char) {
    const branchCount = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
    const jumpOffset = current & BinTrieFlags.JUMP_TABLE;
    // Case 1: Single branch encoded in jump offset
    if (branchCount === 0) {
        return jumpOffset !== 0 && char === jumpOffset ? nodeIndex : -1;
    }
    // Case 2: Multiple branches encoded in jump table
    if (jumpOffset) {
        const value = char - jumpOffset;
        return value < 0 || value >= branchCount
            ? -1
            : decodeTree[nodeIndex + value] - 1;
    }
    // Case 3: Multiple branches encoded in dictionary
    // Binary search for the character.
    let lo = nodeIndex;
    let hi = lo + branchCount - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        const midValue = decodeTree[mid];
        if (midValue < char) {
            lo = mid + 1;
        }
        else if (midValue > char) {
            hi = mid - 1;
        }
        else {
            return decodeTree[mid + branchCount];
        }
    }
    return -1;
}

/** All valid namespaces in HTML. */
var NS;
(function (NS) {
    NS["HTML"] = "http://www.w3.org/1999/xhtml";
    NS["MATHML"] = "http://www.w3.org/1998/Math/MathML";
    NS["SVG"] = "http://www.w3.org/2000/svg";
    NS["XLINK"] = "http://www.w3.org/1999/xlink";
    NS["XML"] = "http://www.w3.org/XML/1998/namespace";
    NS["XMLNS"] = "http://www.w3.org/2000/xmlns/";
})(NS || (NS = {}));
var ATTRS;
(function (ATTRS) {
    ATTRS["TYPE"] = "type";
    ATTRS["ACTION"] = "action";
    ATTRS["ENCODING"] = "encoding";
    ATTRS["PROMPT"] = "prompt";
    ATTRS["NAME"] = "name";
    ATTRS["COLOR"] = "color";
    ATTRS["FACE"] = "face";
    ATTRS["SIZE"] = "size";
})(ATTRS || (ATTRS = {}));
/**
 * The mode of the document.
 *
 * @see {@link https://dom.spec.whatwg.org/#concept-document-limited-quirks}
 */
var DOCUMENT_MODE;
(function (DOCUMENT_MODE) {
    DOCUMENT_MODE["NO_QUIRKS"] = "no-quirks";
    DOCUMENT_MODE["QUIRKS"] = "quirks";
    DOCUMENT_MODE["LIMITED_QUIRKS"] = "limited-quirks";
})(DOCUMENT_MODE || (DOCUMENT_MODE = {}));
var TAG_NAMES;
(function (TAG_NAMES) {
    TAG_NAMES["A"] = "a";
    TAG_NAMES["ADDRESS"] = "address";
    TAG_NAMES["ANNOTATION_XML"] = "annotation-xml";
    TAG_NAMES["APPLET"] = "applet";
    TAG_NAMES["AREA"] = "area";
    TAG_NAMES["ARTICLE"] = "article";
    TAG_NAMES["ASIDE"] = "aside";
    TAG_NAMES["B"] = "b";
    TAG_NAMES["BASE"] = "base";
    TAG_NAMES["BASEFONT"] = "basefont";
    TAG_NAMES["BGSOUND"] = "bgsound";
    TAG_NAMES["BIG"] = "big";
    TAG_NAMES["BLOCKQUOTE"] = "blockquote";
    TAG_NAMES["BODY"] = "body";
    TAG_NAMES["BR"] = "br";
    TAG_NAMES["BUTTON"] = "button";
    TAG_NAMES["CAPTION"] = "caption";
    TAG_NAMES["CENTER"] = "center";
    TAG_NAMES["CODE"] = "code";
    TAG_NAMES["COL"] = "col";
    TAG_NAMES["COLGROUP"] = "colgroup";
    TAG_NAMES["DD"] = "dd";
    TAG_NAMES["DESC"] = "desc";
    TAG_NAMES["DETAILS"] = "details";
    TAG_NAMES["DIALOG"] = "dialog";
    TAG_NAMES["DIR"] = "dir";
    TAG_NAMES["DIV"] = "div";
    TAG_NAMES["DL"] = "dl";
    TAG_NAMES["DT"] = "dt";
    TAG_NAMES["EM"] = "em";
    TAG_NAMES["EMBED"] = "embed";
    TAG_NAMES["FIELDSET"] = "fieldset";
    TAG_NAMES["FIGCAPTION"] = "figcaption";
    TAG_NAMES["FIGURE"] = "figure";
    TAG_NAMES["FONT"] = "font";
    TAG_NAMES["FOOTER"] = "footer";
    TAG_NAMES["FOREIGN_OBJECT"] = "foreignObject";
    TAG_NAMES["FORM"] = "form";
    TAG_NAMES["FRAME"] = "frame";
    TAG_NAMES["FRAMESET"] = "frameset";
    TAG_NAMES["H1"] = "h1";
    TAG_NAMES["H2"] = "h2";
    TAG_NAMES["H3"] = "h3";
    TAG_NAMES["H4"] = "h4";
    TAG_NAMES["H5"] = "h5";
    TAG_NAMES["H6"] = "h6";
    TAG_NAMES["HEAD"] = "head";
    TAG_NAMES["HEADER"] = "header";
    TAG_NAMES["HGROUP"] = "hgroup";
    TAG_NAMES["HR"] = "hr";
    TAG_NAMES["HTML"] = "html";
    TAG_NAMES["I"] = "i";
    TAG_NAMES["IMG"] = "img";
    TAG_NAMES["IMAGE"] = "image";
    TAG_NAMES["INPUT"] = "input";
    TAG_NAMES["IFRAME"] = "iframe";
    TAG_NAMES["KEYGEN"] = "keygen";
    TAG_NAMES["LABEL"] = "label";
    TAG_NAMES["LI"] = "li";
    TAG_NAMES["LINK"] = "link";
    TAG_NAMES["LISTING"] = "listing";
    TAG_NAMES["MAIN"] = "main";
    TAG_NAMES["MALIGNMARK"] = "malignmark";
    TAG_NAMES["MARQUEE"] = "marquee";
    TAG_NAMES["MATH"] = "math";
    TAG_NAMES["MENU"] = "menu";
    TAG_NAMES["META"] = "meta";
    TAG_NAMES["MGLYPH"] = "mglyph";
    TAG_NAMES["MI"] = "mi";
    TAG_NAMES["MO"] = "mo";
    TAG_NAMES["MN"] = "mn";
    TAG_NAMES["MS"] = "ms";
    TAG_NAMES["MTEXT"] = "mtext";
    TAG_NAMES["NAV"] = "nav";
    TAG_NAMES["NOBR"] = "nobr";
    TAG_NAMES["NOFRAMES"] = "noframes";
    TAG_NAMES["NOEMBED"] = "noembed";
    TAG_NAMES["NOSCRIPT"] = "noscript";
    TAG_NAMES["OBJECT"] = "object";
    TAG_NAMES["OL"] = "ol";
    TAG_NAMES["OPTGROUP"] = "optgroup";
    TAG_NAMES["OPTION"] = "option";
    TAG_NAMES["P"] = "p";
    TAG_NAMES["PARAM"] = "param";
    TAG_NAMES["PLAINTEXT"] = "plaintext";
    TAG_NAMES["PRE"] = "pre";
    TAG_NAMES["RB"] = "rb";
    TAG_NAMES["RP"] = "rp";
    TAG_NAMES["RT"] = "rt";
    TAG_NAMES["RTC"] = "rtc";
    TAG_NAMES["RUBY"] = "ruby";
    TAG_NAMES["S"] = "s";
    TAG_NAMES["SCRIPT"] = "script";
    TAG_NAMES["SEARCH"] = "search";
    TAG_NAMES["SECTION"] = "section";
    TAG_NAMES["SELECT"] = "select";
    TAG_NAMES["SOURCE"] = "source";
    TAG_NAMES["SMALL"] = "small";
    TAG_NAMES["SPAN"] = "span";
    TAG_NAMES["STRIKE"] = "strike";
    TAG_NAMES["STRONG"] = "strong";
    TAG_NAMES["STYLE"] = "style";
    TAG_NAMES["SUB"] = "sub";
    TAG_NAMES["SUMMARY"] = "summary";
    TAG_NAMES["SUP"] = "sup";
    TAG_NAMES["TABLE"] = "table";
    TAG_NAMES["TBODY"] = "tbody";
    TAG_NAMES["TEMPLATE"] = "template";
    TAG_NAMES["TEXTAREA"] = "textarea";
    TAG_NAMES["TFOOT"] = "tfoot";
    TAG_NAMES["TD"] = "td";
    TAG_NAMES["TH"] = "th";
    TAG_NAMES["THEAD"] = "thead";
    TAG_NAMES["TITLE"] = "title";
    TAG_NAMES["TR"] = "tr";
    TAG_NAMES["TRACK"] = "track";
    TAG_NAMES["TT"] = "tt";
    TAG_NAMES["U"] = "u";
    TAG_NAMES["UL"] = "ul";
    TAG_NAMES["SVG"] = "svg";
    TAG_NAMES["VAR"] = "var";
    TAG_NAMES["WBR"] = "wbr";
    TAG_NAMES["XMP"] = "xmp";
})(TAG_NAMES || (TAG_NAMES = {}));
/**
 * Tag IDs are numeric IDs for known tag names.
 *
 * We use tag IDs to improve the performance of tag name comparisons.
 */
var TAG_ID;
(function (TAG_ID) {
    TAG_ID[TAG_ID["UNKNOWN"] = 0] = "UNKNOWN";
    TAG_ID[TAG_ID["A"] = 1] = "A";
    TAG_ID[TAG_ID["ADDRESS"] = 2] = "ADDRESS";
    TAG_ID[TAG_ID["ANNOTATION_XML"] = 3] = "ANNOTATION_XML";
    TAG_ID[TAG_ID["APPLET"] = 4] = "APPLET";
    TAG_ID[TAG_ID["AREA"] = 5] = "AREA";
    TAG_ID[TAG_ID["ARTICLE"] = 6] = "ARTICLE";
    TAG_ID[TAG_ID["ASIDE"] = 7] = "ASIDE";
    TAG_ID[TAG_ID["B"] = 8] = "B";
    TAG_ID[TAG_ID["BASE"] = 9] = "BASE";
    TAG_ID[TAG_ID["BASEFONT"] = 10] = "BASEFONT";
    TAG_ID[TAG_ID["BGSOUND"] = 11] = "BGSOUND";
    TAG_ID[TAG_ID["BIG"] = 12] = "BIG";
    TAG_ID[TAG_ID["BLOCKQUOTE"] = 13] = "BLOCKQUOTE";
    TAG_ID[TAG_ID["BODY"] = 14] = "BODY";
    TAG_ID[TAG_ID["BR"] = 15] = "BR";
    TAG_ID[TAG_ID["BUTTON"] = 16] = "BUTTON";
    TAG_ID[TAG_ID["CAPTION"] = 17] = "CAPTION";
    TAG_ID[TAG_ID["CENTER"] = 18] = "CENTER";
    TAG_ID[TAG_ID["CODE"] = 19] = "CODE";
    TAG_ID[TAG_ID["COL"] = 20] = "COL";
    TAG_ID[TAG_ID["COLGROUP"] = 21] = "COLGROUP";
    TAG_ID[TAG_ID["DD"] = 22] = "DD";
    TAG_ID[TAG_ID["DESC"] = 23] = "DESC";
    TAG_ID[TAG_ID["DETAILS"] = 24] = "DETAILS";
    TAG_ID[TAG_ID["DIALOG"] = 25] = "DIALOG";
    TAG_ID[TAG_ID["DIR"] = 26] = "DIR";
    TAG_ID[TAG_ID["DIV"] = 27] = "DIV";
    TAG_ID[TAG_ID["DL"] = 28] = "DL";
    TAG_ID[TAG_ID["DT"] = 29] = "DT";
    TAG_ID[TAG_ID["EM"] = 30] = "EM";
    TAG_ID[TAG_ID["EMBED"] = 31] = "EMBED";
    TAG_ID[TAG_ID["FIELDSET"] = 32] = "FIELDSET";
    TAG_ID[TAG_ID["FIGCAPTION"] = 33] = "FIGCAPTION";
    TAG_ID[TAG_ID["FIGURE"] = 34] = "FIGURE";
    TAG_ID[TAG_ID["FONT"] = 35] = "FONT";
    TAG_ID[TAG_ID["FOOTER"] = 36] = "FOOTER";
    TAG_ID[TAG_ID["FOREIGN_OBJECT"] = 37] = "FOREIGN_OBJECT";
    TAG_ID[TAG_ID["FORM"] = 38] = "FORM";
    TAG_ID[TAG_ID["FRAME"] = 39] = "FRAME";
    TAG_ID[TAG_ID["FRAMESET"] = 40] = "FRAMESET";
    TAG_ID[TAG_ID["H1"] = 41] = "H1";
    TAG_ID[TAG_ID["H2"] = 42] = "H2";
    TAG_ID[TAG_ID["H3"] = 43] = "H3";
    TAG_ID[TAG_ID["H4"] = 44] = "H4";
    TAG_ID[TAG_ID["H5"] = 45] = "H5";
    TAG_ID[TAG_ID["H6"] = 46] = "H6";
    TAG_ID[TAG_ID["HEAD"] = 47] = "HEAD";
    TAG_ID[TAG_ID["HEADER"] = 48] = "HEADER";
    TAG_ID[TAG_ID["HGROUP"] = 49] = "HGROUP";
    TAG_ID[TAG_ID["HR"] = 50] = "HR";
    TAG_ID[TAG_ID["HTML"] = 51] = "HTML";
    TAG_ID[TAG_ID["I"] = 52] = "I";
    TAG_ID[TAG_ID["IMG"] = 53] = "IMG";
    TAG_ID[TAG_ID["IMAGE"] = 54] = "IMAGE";
    TAG_ID[TAG_ID["INPUT"] = 55] = "INPUT";
    TAG_ID[TAG_ID["IFRAME"] = 56] = "IFRAME";
    TAG_ID[TAG_ID["KEYGEN"] = 57] = "KEYGEN";
    TAG_ID[TAG_ID["LABEL"] = 58] = "LABEL";
    TAG_ID[TAG_ID["LI"] = 59] = "LI";
    TAG_ID[TAG_ID["LINK"] = 60] = "LINK";
    TAG_ID[TAG_ID["LISTING"] = 61] = "LISTING";
    TAG_ID[TAG_ID["MAIN"] = 62] = "MAIN";
    TAG_ID[TAG_ID["MALIGNMARK"] = 63] = "MALIGNMARK";
    TAG_ID[TAG_ID["MARQUEE"] = 64] = "MARQUEE";
    TAG_ID[TAG_ID["MATH"] = 65] = "MATH";
    TAG_ID[TAG_ID["MENU"] = 66] = "MENU";
    TAG_ID[TAG_ID["META"] = 67] = "META";
    TAG_ID[TAG_ID["MGLYPH"] = 68] = "MGLYPH";
    TAG_ID[TAG_ID["MI"] = 69] = "MI";
    TAG_ID[TAG_ID["MO"] = 70] = "MO";
    TAG_ID[TAG_ID["MN"] = 71] = "MN";
    TAG_ID[TAG_ID["MS"] = 72] = "MS";
    TAG_ID[TAG_ID["MTEXT"] = 73] = "MTEXT";
    TAG_ID[TAG_ID["NAV"] = 74] = "NAV";
    TAG_ID[TAG_ID["NOBR"] = 75] = "NOBR";
    TAG_ID[TAG_ID["NOFRAMES"] = 76] = "NOFRAMES";
    TAG_ID[TAG_ID["NOEMBED"] = 77] = "NOEMBED";
    TAG_ID[TAG_ID["NOSCRIPT"] = 78] = "NOSCRIPT";
    TAG_ID[TAG_ID["OBJECT"] = 79] = "OBJECT";
    TAG_ID[TAG_ID["OL"] = 80] = "OL";
    TAG_ID[TAG_ID["OPTGROUP"] = 81] = "OPTGROUP";
    TAG_ID[TAG_ID["OPTION"] = 82] = "OPTION";
    TAG_ID[TAG_ID["P"] = 83] = "P";
    TAG_ID[TAG_ID["PARAM"] = 84] = "PARAM";
    TAG_ID[TAG_ID["PLAINTEXT"] = 85] = "PLAINTEXT";
    TAG_ID[TAG_ID["PRE"] = 86] = "PRE";
    TAG_ID[TAG_ID["RB"] = 87] = "RB";
    TAG_ID[TAG_ID["RP"] = 88] = "RP";
    TAG_ID[TAG_ID["RT"] = 89] = "RT";
    TAG_ID[TAG_ID["RTC"] = 90] = "RTC";
    TAG_ID[TAG_ID["RUBY"] = 91] = "RUBY";
    TAG_ID[TAG_ID["S"] = 92] = "S";
    TAG_ID[TAG_ID["SCRIPT"] = 93] = "SCRIPT";
    TAG_ID[TAG_ID["SEARCH"] = 94] = "SEARCH";
    TAG_ID[TAG_ID["SECTION"] = 95] = "SECTION";
    TAG_ID[TAG_ID["SELECT"] = 96] = "SELECT";
    TAG_ID[TAG_ID["SOURCE"] = 97] = "SOURCE";
    TAG_ID[TAG_ID["SMALL"] = 98] = "SMALL";
    TAG_ID[TAG_ID["SPAN"] = 99] = "SPAN";
    TAG_ID[TAG_ID["STRIKE"] = 100] = "STRIKE";
    TAG_ID[TAG_ID["STRONG"] = 101] = "STRONG";
    TAG_ID[TAG_ID["STYLE"] = 102] = "STYLE";
    TAG_ID[TAG_ID["SUB"] = 103] = "SUB";
    TAG_ID[TAG_ID["SUMMARY"] = 104] = "SUMMARY";
    TAG_ID[TAG_ID["SUP"] = 105] = "SUP";
    TAG_ID[TAG_ID["TABLE"] = 106] = "TABLE";
    TAG_ID[TAG_ID["TBODY"] = 107] = "TBODY";
    TAG_ID[TAG_ID["TEMPLATE"] = 108] = "TEMPLATE";
    TAG_ID[TAG_ID["TEXTAREA"] = 109] = "TEXTAREA";
    TAG_ID[TAG_ID["TFOOT"] = 110] = "TFOOT";
    TAG_ID[TAG_ID["TD"] = 111] = "TD";
    TAG_ID[TAG_ID["TH"] = 112] = "TH";
    TAG_ID[TAG_ID["THEAD"] = 113] = "THEAD";
    TAG_ID[TAG_ID["TITLE"] = 114] = "TITLE";
    TAG_ID[TAG_ID["TR"] = 115] = "TR";
    TAG_ID[TAG_ID["TRACK"] = 116] = "TRACK";
    TAG_ID[TAG_ID["TT"] = 117] = "TT";
    TAG_ID[TAG_ID["U"] = 118] = "U";
    TAG_ID[TAG_ID["UL"] = 119] = "UL";
    TAG_ID[TAG_ID["SVG"] = 120] = "SVG";
    TAG_ID[TAG_ID["VAR"] = 121] = "VAR";
    TAG_ID[TAG_ID["WBR"] = 122] = "WBR";
    TAG_ID[TAG_ID["XMP"] = 123] = "XMP";
})(TAG_ID || (TAG_ID = {}));
const TAG_NAME_TO_ID = new Map([
    [TAG_NAMES.A, TAG_ID.A],
    [TAG_NAMES.ADDRESS, TAG_ID.ADDRESS],
    [TAG_NAMES.ANNOTATION_XML, TAG_ID.ANNOTATION_XML],
    [TAG_NAMES.APPLET, TAG_ID.APPLET],
    [TAG_NAMES.AREA, TAG_ID.AREA],
    [TAG_NAMES.ARTICLE, TAG_ID.ARTICLE],
    [TAG_NAMES.ASIDE, TAG_ID.ASIDE],
    [TAG_NAMES.B, TAG_ID.B],
    [TAG_NAMES.BASE, TAG_ID.BASE],
    [TAG_NAMES.BASEFONT, TAG_ID.BASEFONT],
    [TAG_NAMES.BGSOUND, TAG_ID.BGSOUND],
    [TAG_NAMES.BIG, TAG_ID.BIG],
    [TAG_NAMES.BLOCKQUOTE, TAG_ID.BLOCKQUOTE],
    [TAG_NAMES.BODY, TAG_ID.BODY],
    [TAG_NAMES.BR, TAG_ID.BR],
    [TAG_NAMES.BUTTON, TAG_ID.BUTTON],
    [TAG_NAMES.CAPTION, TAG_ID.CAPTION],
    [TAG_NAMES.CENTER, TAG_ID.CENTER],
    [TAG_NAMES.CODE, TAG_ID.CODE],
    [TAG_NAMES.COL, TAG_ID.COL],
    [TAG_NAMES.COLGROUP, TAG_ID.COLGROUP],
    [TAG_NAMES.DD, TAG_ID.DD],
    [TAG_NAMES.DESC, TAG_ID.DESC],
    [TAG_NAMES.DETAILS, TAG_ID.DETAILS],
    [TAG_NAMES.DIALOG, TAG_ID.DIALOG],
    [TAG_NAMES.DIR, TAG_ID.DIR],
    [TAG_NAMES.DIV, TAG_ID.DIV],
    [TAG_NAMES.DL, TAG_ID.DL],
    [TAG_NAMES.DT, TAG_ID.DT],
    [TAG_NAMES.EM, TAG_ID.EM],
    [TAG_NAMES.EMBED, TAG_ID.EMBED],
    [TAG_NAMES.FIELDSET, TAG_ID.FIELDSET],
    [TAG_NAMES.FIGCAPTION, TAG_ID.FIGCAPTION],
    [TAG_NAMES.FIGURE, TAG_ID.FIGURE],
    [TAG_NAMES.FONT, TAG_ID.FONT],
    [TAG_NAMES.FOOTER, TAG_ID.FOOTER],
    [TAG_NAMES.FOREIGN_OBJECT, TAG_ID.FOREIGN_OBJECT],
    [TAG_NAMES.FORM, TAG_ID.FORM],
    [TAG_NAMES.FRAME, TAG_ID.FRAME],
    [TAG_NAMES.FRAMESET, TAG_ID.FRAMESET],
    [TAG_NAMES.H1, TAG_ID.H1],
    [TAG_NAMES.H2, TAG_ID.H2],
    [TAG_NAMES.H3, TAG_ID.H3],
    [TAG_NAMES.H4, TAG_ID.H4],
    [TAG_NAMES.H5, TAG_ID.H5],
    [TAG_NAMES.H6, TAG_ID.H6],
    [TAG_NAMES.HEAD, TAG_ID.HEAD],
    [TAG_NAMES.HEADER, TAG_ID.HEADER],
    [TAG_NAMES.HGROUP, TAG_ID.HGROUP],
    [TAG_NAMES.HR, TAG_ID.HR],
    [TAG_NAMES.HTML, TAG_ID.HTML],
    [TAG_NAMES.I, TAG_ID.I],
    [TAG_NAMES.IMG, TAG_ID.IMG],
    [TAG_NAMES.IMAGE, TAG_ID.IMAGE],
    [TAG_NAMES.INPUT, TAG_ID.INPUT],
    [TAG_NAMES.IFRAME, TAG_ID.IFRAME],
    [TAG_NAMES.KEYGEN, TAG_ID.KEYGEN],
    [TAG_NAMES.LABEL, TAG_ID.LABEL],
    [TAG_NAMES.LI, TAG_ID.LI],
    [TAG_NAMES.LINK, TAG_ID.LINK],
    [TAG_NAMES.LISTING, TAG_ID.LISTING],
    [TAG_NAMES.MAIN, TAG_ID.MAIN],
    [TAG_NAMES.MALIGNMARK, TAG_ID.MALIGNMARK],
    [TAG_NAMES.MARQUEE, TAG_ID.MARQUEE],
    [TAG_NAMES.MATH, TAG_ID.MATH],
    [TAG_NAMES.MENU, TAG_ID.MENU],
    [TAG_NAMES.META, TAG_ID.META],
    [TAG_NAMES.MGLYPH, TAG_ID.MGLYPH],
    [TAG_NAMES.MI, TAG_ID.MI],
    [TAG_NAMES.MO, TAG_ID.MO],
    [TAG_NAMES.MN, TAG_ID.MN],
    [TAG_NAMES.MS, TAG_ID.MS],
    [TAG_NAMES.MTEXT, TAG_ID.MTEXT],
    [TAG_NAMES.NAV, TAG_ID.NAV],
    [TAG_NAMES.NOBR, TAG_ID.NOBR],
    [TAG_NAMES.NOFRAMES, TAG_ID.NOFRAMES],
    [TAG_NAMES.NOEMBED, TAG_ID.NOEMBED],
    [TAG_NAMES.NOSCRIPT, TAG_ID.NOSCRIPT],
    [TAG_NAMES.OBJECT, TAG_ID.OBJECT],
    [TAG_NAMES.OL, TAG_ID.OL],
    [TAG_NAMES.OPTGROUP, TAG_ID.OPTGROUP],
    [TAG_NAMES.OPTION, TAG_ID.OPTION],
    [TAG_NAMES.P, TAG_ID.P],
    [TAG_NAMES.PARAM, TAG_ID.PARAM],
    [TAG_NAMES.PLAINTEXT, TAG_ID.PLAINTEXT],
    [TAG_NAMES.PRE, TAG_ID.PRE],
    [TAG_NAMES.RB, TAG_ID.RB],
    [TAG_NAMES.RP, TAG_ID.RP],
    [TAG_NAMES.RT, TAG_ID.RT],
    [TAG_NAMES.RTC, TAG_ID.RTC],
    [TAG_NAMES.RUBY, TAG_ID.RUBY],
    [TAG_NAMES.S, TAG_ID.S],
    [TAG_NAMES.SCRIPT, TAG_ID.SCRIPT],
    [TAG_NAMES.SEARCH, TAG_ID.SEARCH],
    [TAG_NAMES.SECTION, TAG_ID.SECTION],
    [TAG_NAMES.SELECT, TAG_ID.SELECT],
    [TAG_NAMES.SOURCE, TAG_ID.SOURCE],
    [TAG_NAMES.SMALL, TAG_ID.SMALL],
    [TAG_NAMES.SPAN, TAG_ID.SPAN],
    [TAG_NAMES.STRIKE, TAG_ID.STRIKE],
    [TAG_NAMES.STRONG, TAG_ID.STRONG],
    [TAG_NAMES.STYLE, TAG_ID.STYLE],
    [TAG_NAMES.SUB, TAG_ID.SUB],
    [TAG_NAMES.SUMMARY, TAG_ID.SUMMARY],
    [TAG_NAMES.SUP, TAG_ID.SUP],
    [TAG_NAMES.TABLE, TAG_ID.TABLE],
    [TAG_NAMES.TBODY, TAG_ID.TBODY],
    [TAG_NAMES.TEMPLATE, TAG_ID.TEMPLATE],
    [TAG_NAMES.TEXTAREA, TAG_ID.TEXTAREA],
    [TAG_NAMES.TFOOT, TAG_ID.TFOOT],
    [TAG_NAMES.TD, TAG_ID.TD],
    [TAG_NAMES.TH, TAG_ID.TH],
    [TAG_NAMES.THEAD, TAG_ID.THEAD],
    [TAG_NAMES.TITLE, TAG_ID.TITLE],
    [TAG_NAMES.TR, TAG_ID.TR],
    [TAG_NAMES.TRACK, TAG_ID.TRACK],
    [TAG_NAMES.TT, TAG_ID.TT],
    [TAG_NAMES.U, TAG_ID.U],
    [TAG_NAMES.UL, TAG_ID.UL],
    [TAG_NAMES.SVG, TAG_ID.SVG],
    [TAG_NAMES.VAR, TAG_ID.VAR],
    [TAG_NAMES.WBR, TAG_ID.WBR],
    [TAG_NAMES.XMP, TAG_ID.XMP],
]);
function getTagID(tagName) {
    var _a;
    return (_a = TAG_NAME_TO_ID.get(tagName)) !== null && _a !== void 0 ? _a : TAG_ID.UNKNOWN;
}
const $ = TAG_ID;
const SPECIAL_ELEMENTS = {
    [NS.HTML]: new Set([
        $.ADDRESS,
        $.APPLET,
        $.AREA,
        $.ARTICLE,
        $.ASIDE,
        $.BASE,
        $.BASEFONT,
        $.BGSOUND,
        $.BLOCKQUOTE,
        $.BODY,
        $.BR,
        $.BUTTON,
        $.CAPTION,
        $.CENTER,
        $.COL,
        $.COLGROUP,
        $.DD,
        $.DETAILS,
        $.DIR,
        $.DIV,
        $.DL,
        $.DT,
        $.EMBED,
        $.FIELDSET,
        $.FIGCAPTION,
        $.FIGURE,
        $.FOOTER,
        $.FORM,
        $.FRAME,
        $.FRAMESET,
        $.H1,
        $.H2,
        $.H3,
        $.H4,
        $.H5,
        $.H6,
        $.HEAD,
        $.HEADER,
        $.HGROUP,
        $.HR,
        $.HTML,
        $.IFRAME,
        $.IMG,
        $.INPUT,
        $.LI,
        $.LINK,
        $.LISTING,
        $.MAIN,
        $.MARQUEE,
        $.MENU,
        $.META,
        $.NAV,
        $.NOEMBED,
        $.NOFRAMES,
        $.NOSCRIPT,
        $.OBJECT,
        $.OL,
        $.P,
        $.PARAM,
        $.PLAINTEXT,
        $.PRE,
        $.SCRIPT,
        $.SECTION,
        $.SELECT,
        $.SOURCE,
        $.STYLE,
        $.SUMMARY,
        $.TABLE,
        $.TBODY,
        $.TD,
        $.TEMPLATE,
        $.TEXTAREA,
        $.TFOOT,
        $.TH,
        $.THEAD,
        $.TITLE,
        $.TR,
        $.TRACK,
        $.UL,
        $.WBR,
        $.XMP,
    ]),
    [NS.MATHML]: new Set([$.MI, $.MO, $.MN, $.MS, $.MTEXT, $.ANNOTATION_XML]),
    [NS.SVG]: new Set([$.TITLE, $.FOREIGN_OBJECT, $.DESC]),
    [NS.XLINK]: new Set(),
    [NS.XML]: new Set(),
    [NS.XMLNS]: new Set(),
};
const NUMBERED_HEADERS = new Set([$.H1, $.H2, $.H3, $.H4, $.H5, $.H6]);
const UNESCAPED_TEXT = new Set([
    TAG_NAMES.STYLE,
    TAG_NAMES.SCRIPT,
    TAG_NAMES.XMP,
    TAG_NAMES.IFRAME,
    TAG_NAMES.NOEMBED,
    TAG_NAMES.NOFRAMES,
    TAG_NAMES.PLAINTEXT,
]);
function hasUnescapedText(tn, scriptingEnabled) {
    return UNESCAPED_TEXT.has(tn) || (scriptingEnabled && tn === TAG_NAMES.NOSCRIPT);
}

//States
var State;
(function (State) {
    State[State["DATA"] = 0] = "DATA";
    State[State["RCDATA"] = 1] = "RCDATA";
    State[State["RAWTEXT"] = 2] = "RAWTEXT";
    State[State["SCRIPT_DATA"] = 3] = "SCRIPT_DATA";
    State[State["PLAINTEXT"] = 4] = "PLAINTEXT";
    State[State["TAG_OPEN"] = 5] = "TAG_OPEN";
    State[State["END_TAG_OPEN"] = 6] = "END_TAG_OPEN";
    State[State["TAG_NAME"] = 7] = "TAG_NAME";
    State[State["RCDATA_LESS_THAN_SIGN"] = 8] = "RCDATA_LESS_THAN_SIGN";
    State[State["RCDATA_END_TAG_OPEN"] = 9] = "RCDATA_END_TAG_OPEN";
    State[State["RCDATA_END_TAG_NAME"] = 10] = "RCDATA_END_TAG_NAME";
    State[State["RAWTEXT_LESS_THAN_SIGN"] = 11] = "RAWTEXT_LESS_THAN_SIGN";
    State[State["RAWTEXT_END_TAG_OPEN"] = 12] = "RAWTEXT_END_TAG_OPEN";
    State[State["RAWTEXT_END_TAG_NAME"] = 13] = "RAWTEXT_END_TAG_NAME";
    State[State["SCRIPT_DATA_LESS_THAN_SIGN"] = 14] = "SCRIPT_DATA_LESS_THAN_SIGN";
    State[State["SCRIPT_DATA_END_TAG_OPEN"] = 15] = "SCRIPT_DATA_END_TAG_OPEN";
    State[State["SCRIPT_DATA_END_TAG_NAME"] = 16] = "SCRIPT_DATA_END_TAG_NAME";
    State[State["SCRIPT_DATA_ESCAPE_START"] = 17] = "SCRIPT_DATA_ESCAPE_START";
    State[State["SCRIPT_DATA_ESCAPE_START_DASH"] = 18] = "SCRIPT_DATA_ESCAPE_START_DASH";
    State[State["SCRIPT_DATA_ESCAPED"] = 19] = "SCRIPT_DATA_ESCAPED";
    State[State["SCRIPT_DATA_ESCAPED_DASH"] = 20] = "SCRIPT_DATA_ESCAPED_DASH";
    State[State["SCRIPT_DATA_ESCAPED_DASH_DASH"] = 21] = "SCRIPT_DATA_ESCAPED_DASH_DASH";
    State[State["SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN"] = 22] = "SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN";
    State[State["SCRIPT_DATA_ESCAPED_END_TAG_OPEN"] = 23] = "SCRIPT_DATA_ESCAPED_END_TAG_OPEN";
    State[State["SCRIPT_DATA_ESCAPED_END_TAG_NAME"] = 24] = "SCRIPT_DATA_ESCAPED_END_TAG_NAME";
    State[State["SCRIPT_DATA_DOUBLE_ESCAPE_START"] = 25] = "SCRIPT_DATA_DOUBLE_ESCAPE_START";
    State[State["SCRIPT_DATA_DOUBLE_ESCAPED"] = 26] = "SCRIPT_DATA_DOUBLE_ESCAPED";
    State[State["SCRIPT_DATA_DOUBLE_ESCAPED_DASH"] = 27] = "SCRIPT_DATA_DOUBLE_ESCAPED_DASH";
    State[State["SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH"] = 28] = "SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH";
    State[State["SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN"] = 29] = "SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN";
    State[State["SCRIPT_DATA_DOUBLE_ESCAPE_END"] = 30] = "SCRIPT_DATA_DOUBLE_ESCAPE_END";
    State[State["BEFORE_ATTRIBUTE_NAME"] = 31] = "BEFORE_ATTRIBUTE_NAME";
    State[State["ATTRIBUTE_NAME"] = 32] = "ATTRIBUTE_NAME";
    State[State["AFTER_ATTRIBUTE_NAME"] = 33] = "AFTER_ATTRIBUTE_NAME";
    State[State["BEFORE_ATTRIBUTE_VALUE"] = 34] = "BEFORE_ATTRIBUTE_VALUE";
    State[State["ATTRIBUTE_VALUE_DOUBLE_QUOTED"] = 35] = "ATTRIBUTE_VALUE_DOUBLE_QUOTED";
    State[State["ATTRIBUTE_VALUE_SINGLE_QUOTED"] = 36] = "ATTRIBUTE_VALUE_SINGLE_QUOTED";
    State[State["ATTRIBUTE_VALUE_UNQUOTED"] = 37] = "ATTRIBUTE_VALUE_UNQUOTED";
    State[State["AFTER_ATTRIBUTE_VALUE_QUOTED"] = 38] = "AFTER_ATTRIBUTE_VALUE_QUOTED";
    State[State["SELF_CLOSING_START_TAG"] = 39] = "SELF_CLOSING_START_TAG";
    State[State["BOGUS_COMMENT"] = 40] = "BOGUS_COMMENT";
    State[State["MARKUP_DECLARATION_OPEN"] = 41] = "MARKUP_DECLARATION_OPEN";
    State[State["COMMENT_START"] = 42] = "COMMENT_START";
    State[State["COMMENT_START_DASH"] = 43] = "COMMENT_START_DASH";
    State[State["COMMENT"] = 44] = "COMMENT";
    State[State["COMMENT_LESS_THAN_SIGN"] = 45] = "COMMENT_LESS_THAN_SIGN";
    State[State["COMMENT_LESS_THAN_SIGN_BANG"] = 46] = "COMMENT_LESS_THAN_SIGN_BANG";
    State[State["COMMENT_LESS_THAN_SIGN_BANG_DASH"] = 47] = "COMMENT_LESS_THAN_SIGN_BANG_DASH";
    State[State["COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH"] = 48] = "COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH";
    State[State["COMMENT_END_DASH"] = 49] = "COMMENT_END_DASH";
    State[State["COMMENT_END"] = 50] = "COMMENT_END";
    State[State["COMMENT_END_BANG"] = 51] = "COMMENT_END_BANG";
    State[State["DOCTYPE"] = 52] = "DOCTYPE";
    State[State["BEFORE_DOCTYPE_NAME"] = 53] = "BEFORE_DOCTYPE_NAME";
    State[State["DOCTYPE_NAME"] = 54] = "DOCTYPE_NAME";
    State[State["AFTER_DOCTYPE_NAME"] = 55] = "AFTER_DOCTYPE_NAME";
    State[State["AFTER_DOCTYPE_PUBLIC_KEYWORD"] = 56] = "AFTER_DOCTYPE_PUBLIC_KEYWORD";
    State[State["BEFORE_DOCTYPE_PUBLIC_IDENTIFIER"] = 57] = "BEFORE_DOCTYPE_PUBLIC_IDENTIFIER";
    State[State["DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED"] = 58] = "DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED";
    State[State["DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED"] = 59] = "DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED";
    State[State["AFTER_DOCTYPE_PUBLIC_IDENTIFIER"] = 60] = "AFTER_DOCTYPE_PUBLIC_IDENTIFIER";
    State[State["BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS"] = 61] = "BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS";
    State[State["AFTER_DOCTYPE_SYSTEM_KEYWORD"] = 62] = "AFTER_DOCTYPE_SYSTEM_KEYWORD";
    State[State["BEFORE_DOCTYPE_SYSTEM_IDENTIFIER"] = 63] = "BEFORE_DOCTYPE_SYSTEM_IDENTIFIER";
    State[State["DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED"] = 64] = "DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED";
    State[State["DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED"] = 65] = "DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED";
    State[State["AFTER_DOCTYPE_SYSTEM_IDENTIFIER"] = 66] = "AFTER_DOCTYPE_SYSTEM_IDENTIFIER";
    State[State["BOGUS_DOCTYPE"] = 67] = "BOGUS_DOCTYPE";
    State[State["CDATA_SECTION"] = 68] = "CDATA_SECTION";
    State[State["CDATA_SECTION_BRACKET"] = 69] = "CDATA_SECTION_BRACKET";
    State[State["CDATA_SECTION_END"] = 70] = "CDATA_SECTION_END";
    State[State["CHARACTER_REFERENCE"] = 71] = "CHARACTER_REFERENCE";
    State[State["AMBIGUOUS_AMPERSAND"] = 72] = "AMBIGUOUS_AMPERSAND";
})(State || (State = {}));
//Tokenizer initial states for different modes
const TokenizerMode = {
    DATA: State.DATA,
    RCDATA: State.RCDATA,
    RAWTEXT: State.RAWTEXT,
    SCRIPT_DATA: State.SCRIPT_DATA,
    PLAINTEXT: State.PLAINTEXT,
    CDATA_SECTION: State.CDATA_SECTION,
};
//Utils
//OPTIMIZATION: these utility functions should not be moved out of this module. V8 Crankshaft will not inline
//this functions if they will be situated in another module due to context switch.
//Always perform inlining check before modifying this functions ('node --trace-inlining').
function isAsciiDigit(cp) {
    return cp >= CODE_POINTS.DIGIT_0 && cp <= CODE_POINTS.DIGIT_9;
}
function isAsciiUpper(cp) {
    return cp >= CODE_POINTS.LATIN_CAPITAL_A && cp <= CODE_POINTS.LATIN_CAPITAL_Z;
}
function isAsciiLower(cp) {
    return cp >= CODE_POINTS.LATIN_SMALL_A && cp <= CODE_POINTS.LATIN_SMALL_Z;
}
function isAsciiLetter(cp) {
    return isAsciiLower(cp) || isAsciiUpper(cp);
}
function isAsciiAlphaNumeric(cp) {
    return isAsciiLetter(cp) || isAsciiDigit(cp);
}
function toAsciiLower(cp) {
    return cp + 32;
}
function isWhitespace(cp) {
    return cp === CODE_POINTS.SPACE || cp === CODE_POINTS.LINE_FEED || cp === CODE_POINTS.TABULATION || cp === CODE_POINTS.FORM_FEED;
}
function isScriptDataDoubleEscapeSequenceEnd(cp) {
    return isWhitespace(cp) || cp === CODE_POINTS.SOLIDUS || cp === CODE_POINTS.GREATER_THAN_SIGN;
}
function getErrorForNumericCharacterReference(code) {
    if (code === CODE_POINTS.NULL) {
        return ERR.nullCharacterReference;
    }
    else if (code > 1114111) {
        return ERR.characterReferenceOutsideUnicodeRange;
    }
    else if (isSurrogate(code)) {
        return ERR.surrogateCharacterReference;
    }
    else if (isUndefinedCodePoint(code)) {
        return ERR.noncharacterCharacterReference;
    }
    else if (isControlCodePoint(code) || code === CODE_POINTS.CARRIAGE_RETURN) {
        return ERR.controlCharacterReference;
    }
    return null;
}
//Tokenizer
class Tokenizer {
    constructor(options, handler) {
        this.options = options;
        this.handler = handler;
        this.paused = false;
        /** Ensures that the parsing loop isn't run multiple times at once. */
        this.inLoop = false;
        /**
         * Indicates that the current adjusted node exists, is not an element in the HTML namespace,
         * and that it is not an integration point for either MathML or HTML.
         *
         * @see {@link https://html.spec.whatwg.org/multipage/parsing.html#tree-construction}
         */
        this.inForeignNode = false;
        this.lastStartTagName = '';
        this.active = false;
        this.state = State.DATA;
        this.returnState = State.DATA;
        this.entityStartPos = 0;
        this.consumedAfterSnapshot = -1;
        this.currentCharacterToken = null;
        this.currentToken = null;
        this.currentAttr = { name: '', value: '' };
        this.preprocessor = new Preprocessor(handler);
        this.currentLocation = this.getCurrentLocation(-1);
        this.entityDecoder = new EntityDecoder(htmlDecodeTree, (cp, consumed) => {
            // Note: Set `pos` _before_ flushing, as flushing might drop
            // the current chunk and invalidate `entityStartPos`.
            this.preprocessor.pos = this.entityStartPos + consumed - 1;
            this._flushCodePointConsumedAsCharacterReference(cp);
        }, handler.onParseError
            ? {
                missingSemicolonAfterCharacterReference: () => {
                    this._err(ERR.missingSemicolonAfterCharacterReference, 1);
                },
                absenceOfDigitsInNumericCharacterReference: (consumed) => {
                    this._err(ERR.absenceOfDigitsInNumericCharacterReference, this.entityStartPos - this.preprocessor.pos + consumed);
                },
                validateNumericCharacterReference: (code) => {
                    const error = getErrorForNumericCharacterReference(code);
                    if (error)
                        this._err(error, 1);
                },
            }
            : undefined);
    }
    //Errors
    _err(code, cpOffset = 0) {
        var _a, _b;
        (_b = (_a = this.handler).onParseError) === null || _b === void 0 ? void 0 : _b.call(_a, this.preprocessor.getError(code, cpOffset));
    }
    // NOTE: `offset` may never run across line boundaries.
    getCurrentLocation(offset) {
        if (!this.options.sourceCodeLocationInfo) {
            return null;
        }
        return {
            startLine: this.preprocessor.line,
            startCol: this.preprocessor.col - offset,
            startOffset: this.preprocessor.offset - offset,
            endLine: -1,
            endCol: -1,
            endOffset: -1,
        };
    }
    _runParsingLoop() {
        if (this.inLoop)
            return;
        this.inLoop = true;
        while (this.active && !this.paused) {
            this.consumedAfterSnapshot = 0;
            const cp = this._consume();
            if (!this._ensureHibernation()) {
                this._callState(cp);
            }
        }
        this.inLoop = false;
    }
    //API
    pause() {
        this.paused = true;
    }
    resume(writeCallback) {
        if (!this.paused) {
            throw new Error('Parser was already resumed');
        }
        this.paused = false;
        // Necessary for synchronous resume.
        if (this.inLoop)
            return;
        this._runParsingLoop();
        if (!this.paused) {
            writeCallback === null || writeCallback === void 0 ? void 0 : writeCallback();
        }
    }
    write(chunk, isLastChunk, writeCallback) {
        this.active = true;
        this.preprocessor.write(chunk, isLastChunk);
        this._runParsingLoop();
        if (!this.paused) {
            writeCallback === null || writeCallback === void 0 ? void 0 : writeCallback();
        }
    }
    insertHtmlAtCurrentPos(chunk) {
        this.active = true;
        this.preprocessor.insertHtmlAtCurrentPos(chunk);
        this._runParsingLoop();
    }
    //Hibernation
    _ensureHibernation() {
        if (this.preprocessor.endOfChunkHit) {
            this.preprocessor.retreat(this.consumedAfterSnapshot);
            this.consumedAfterSnapshot = 0;
            this.active = false;
            return true;
        }
        return false;
    }
    //Consumption
    _consume() {
        this.consumedAfterSnapshot++;
        return this.preprocessor.advance();
    }
    _advanceBy(count) {
        this.consumedAfterSnapshot += count;
        for (let i = 0; i < count; i++) {
            this.preprocessor.advance();
        }
    }
    _consumeSequenceIfMatch(pattern, caseSensitive) {
        if (this.preprocessor.startsWith(pattern, caseSensitive)) {
            // We will already have consumed one character before calling this method.
            this._advanceBy(pattern.length - 1);
            return true;
        }
        return false;
    }
    //Token creation
    _createStartTagToken() {
        this.currentToken = {
            type: TokenType.START_TAG,
            tagName: '',
            tagID: TAG_ID.UNKNOWN,
            selfClosing: false,
            ackSelfClosing: false,
            attrs: [],
            location: this.getCurrentLocation(1),
        };
    }
    _createEndTagToken() {
        this.currentToken = {
            type: TokenType.END_TAG,
            tagName: '',
            tagID: TAG_ID.UNKNOWN,
            selfClosing: false,
            ackSelfClosing: false,
            attrs: [],
            location: this.getCurrentLocation(2),
        };
    }
    _createCommentToken(offset) {
        this.currentToken = {
            type: TokenType.COMMENT,
            data: '',
            location: this.getCurrentLocation(offset),
        };
    }
    _createDoctypeToken(initialName) {
        this.currentToken = {
            type: TokenType.DOCTYPE,
            name: initialName,
            forceQuirks: false,
            publicId: null,
            systemId: null,
            location: this.currentLocation,
        };
    }
    _createCharacterToken(type, chars) {
        this.currentCharacterToken = {
            type,
            chars,
            location: this.currentLocation,
        };
    }
    //Tag attributes
    _createAttr(attrNameFirstCh) {
        this.currentAttr = {
            name: attrNameFirstCh,
            value: '',
        };
        this.currentLocation = this.getCurrentLocation(0);
    }
    _leaveAttrName() {
        var _a;
        var _b;
        const token = this.currentToken;
        if (getTokenAttr(token, this.currentAttr.name) === null) {
            token.attrs.push(this.currentAttr);
            if (token.location && this.currentLocation) {
                const attrLocations = ((_a = (_b = token.location).attrs) !== null && _a !== void 0 ? _a : (_b.attrs = Object.create(null)));
                attrLocations[this.currentAttr.name] = this.currentLocation;
                // Set end location
                this._leaveAttrValue();
            }
        }
        else {
            this._err(ERR.duplicateAttribute);
        }
    }
    _leaveAttrValue() {
        if (this.currentLocation) {
            this.currentLocation.endLine = this.preprocessor.line;
            this.currentLocation.endCol = this.preprocessor.col;
            this.currentLocation.endOffset = this.preprocessor.offset;
        }
    }
    //Token emission
    prepareToken(ct) {
        this._emitCurrentCharacterToken(ct.location);
        this.currentToken = null;
        if (ct.location) {
            ct.location.endLine = this.preprocessor.line;
            ct.location.endCol = this.preprocessor.col + 1;
            ct.location.endOffset = this.preprocessor.offset + 1;
        }
        this.currentLocation = this.getCurrentLocation(-1);
    }
    emitCurrentTagToken() {
        const ct = this.currentToken;
        this.prepareToken(ct);
        ct.tagID = getTagID(ct.tagName);
        if (ct.type === TokenType.START_TAG) {
            this.lastStartTagName = ct.tagName;
            this.handler.onStartTag(ct);
        }
        else {
            if (ct.attrs.length > 0) {
                this._err(ERR.endTagWithAttributes);
            }
            if (ct.selfClosing) {
                this._err(ERR.endTagWithTrailingSolidus);
            }
            this.handler.onEndTag(ct);
        }
        this.preprocessor.dropParsedChunk();
    }
    emitCurrentComment(ct) {
        this.prepareToken(ct);
        this.handler.onComment(ct);
        this.preprocessor.dropParsedChunk();
    }
    emitCurrentDoctype(ct) {
        this.prepareToken(ct);
        this.handler.onDoctype(ct);
        this.preprocessor.dropParsedChunk();
    }
    _emitCurrentCharacterToken(nextLocation) {
        if (this.currentCharacterToken) {
            //NOTE: if we have a pending character token, make it's end location equal to the
            //current token's start location.
            if (nextLocation && this.currentCharacterToken.location) {
                this.currentCharacterToken.location.endLine = nextLocation.startLine;
                this.currentCharacterToken.location.endCol = nextLocation.startCol;
                this.currentCharacterToken.location.endOffset = nextLocation.startOffset;
            }
            switch (this.currentCharacterToken.type) {
                case TokenType.CHARACTER: {
                    this.handler.onCharacter(this.currentCharacterToken);
                    break;
                }
                case TokenType.NULL_CHARACTER: {
                    this.handler.onNullCharacter(this.currentCharacterToken);
                    break;
                }
                case TokenType.WHITESPACE_CHARACTER: {
                    this.handler.onWhitespaceCharacter(this.currentCharacterToken);
                    break;
                }
            }
            this.currentCharacterToken = null;
        }
    }
    _emitEOFToken() {
        const location = this.getCurrentLocation(0);
        if (location) {
            location.endLine = location.startLine;
            location.endCol = location.startCol;
            location.endOffset = location.startOffset;
        }
        this._emitCurrentCharacterToken(location);
        this.handler.onEof({ type: TokenType.EOF, location });
        this.active = false;
    }
    //Characters emission
    //OPTIMIZATION: The specification uses only one type of character token (one token per character).
    //This causes a huge memory overhead and a lot of unnecessary parser loops. parse5 uses 3 groups of characters.
    //If we have a sequence of characters that belong to the same group, the parser can process it
    //as a single solid character token.
    //So, there are 3 types of character tokens in parse5:
    //1)TokenType.NULL_CHARACTER - \u0000-character sequences (e.g. '\u0000\u0000\u0000')
    //2)TokenType.WHITESPACE_CHARACTER - any whitespace/new-line character sequences (e.g. '\n  \r\t   \f')
    //3)TokenType.CHARACTER - any character sequence which don't belong to groups 1 and 2 (e.g. 'abcdef1234@@#$%^')
    _appendCharToCurrentCharacterToken(type, ch) {
        if (this.currentCharacterToken) {
            if (this.currentCharacterToken.type === type) {
                this.currentCharacterToken.chars += ch;
                return;
            }
            else {
                this.currentLocation = this.getCurrentLocation(0);
                this._emitCurrentCharacterToken(this.currentLocation);
                this.preprocessor.dropParsedChunk();
            }
        }
        this._createCharacterToken(type, ch);
    }
    _emitCodePoint(cp) {
        const type = isWhitespace(cp)
            ? TokenType.WHITESPACE_CHARACTER
            : cp === CODE_POINTS.NULL
                ? TokenType.NULL_CHARACTER
                : TokenType.CHARACTER;
        this._appendCharToCurrentCharacterToken(type, String.fromCodePoint(cp));
    }
    //NOTE: used when we emit characters explicitly.
    //This is always for non-whitespace and non-null characters, which allows us to avoid additional checks.
    _emitChars(ch) {
        this._appendCharToCurrentCharacterToken(TokenType.CHARACTER, ch);
    }
    // Character reference helpers
    _startCharacterReference() {
        this.returnState = this.state;
        this.state = State.CHARACTER_REFERENCE;
        this.entityStartPos = this.preprocessor.pos;
        this.entityDecoder.startEntity(this._isCharacterReferenceInAttribute() ? DecodingMode.Attribute : DecodingMode.Legacy);
    }
    _isCharacterReferenceInAttribute() {
        return (this.returnState === State.ATTRIBUTE_VALUE_DOUBLE_QUOTED ||
            this.returnState === State.ATTRIBUTE_VALUE_SINGLE_QUOTED ||
            this.returnState === State.ATTRIBUTE_VALUE_UNQUOTED);
    }
    _flushCodePointConsumedAsCharacterReference(cp) {
        if (this._isCharacterReferenceInAttribute()) {
            this.currentAttr.value += String.fromCodePoint(cp);
        }
        else {
            this._emitCodePoint(cp);
        }
    }
    // Calling states this way turns out to be much faster than any other approach.
    _callState(cp) {
        switch (this.state) {
            case State.DATA: {
                this._stateData(cp);
                break;
            }
            case State.RCDATA: {
                this._stateRcdata(cp);
                break;
            }
            case State.RAWTEXT: {
                this._stateRawtext(cp);
                break;
            }
            case State.SCRIPT_DATA: {
                this._stateScriptData(cp);
                break;
            }
            case State.PLAINTEXT: {
                this._statePlaintext(cp);
                break;
            }
            case State.TAG_OPEN: {
                this._stateTagOpen(cp);
                break;
            }
            case State.END_TAG_OPEN: {
                this._stateEndTagOpen(cp);
                break;
            }
            case State.TAG_NAME: {
                this._stateTagName(cp);
                break;
            }
            case State.RCDATA_LESS_THAN_SIGN: {
                this._stateRcdataLessThanSign(cp);
                break;
            }
            case State.RCDATA_END_TAG_OPEN: {
                this._stateRcdataEndTagOpen(cp);
                break;
            }
            case State.RCDATA_END_TAG_NAME: {
                this._stateRcdataEndTagName(cp);
                break;
            }
            case State.RAWTEXT_LESS_THAN_SIGN: {
                this._stateRawtextLessThanSign(cp);
                break;
            }
            case State.RAWTEXT_END_TAG_OPEN: {
                this._stateRawtextEndTagOpen(cp);
                break;
            }
            case State.RAWTEXT_END_TAG_NAME: {
                this._stateRawtextEndTagName(cp);
                break;
            }
            case State.SCRIPT_DATA_LESS_THAN_SIGN: {
                this._stateScriptDataLessThanSign(cp);
                break;
            }
            case State.SCRIPT_DATA_END_TAG_OPEN: {
                this._stateScriptDataEndTagOpen(cp);
                break;
            }
            case State.SCRIPT_DATA_END_TAG_NAME: {
                this._stateScriptDataEndTagName(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPE_START: {
                this._stateScriptDataEscapeStart(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPE_START_DASH: {
                this._stateScriptDataEscapeStartDash(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPED: {
                this._stateScriptDataEscaped(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPED_DASH: {
                this._stateScriptDataEscapedDash(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPED_DASH_DASH: {
                this._stateScriptDataEscapedDashDash(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN: {
                this._stateScriptDataEscapedLessThanSign(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPED_END_TAG_OPEN: {
                this._stateScriptDataEscapedEndTagOpen(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPED_END_TAG_NAME: {
                this._stateScriptDataEscapedEndTagName(cp);
                break;
            }
            case State.SCRIPT_DATA_DOUBLE_ESCAPE_START: {
                this._stateScriptDataDoubleEscapeStart(cp);
                break;
            }
            case State.SCRIPT_DATA_DOUBLE_ESCAPED: {
                this._stateScriptDataDoubleEscaped(cp);
                break;
            }
            case State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH: {
                this._stateScriptDataDoubleEscapedDash(cp);
                break;
            }
            case State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH: {
                this._stateScriptDataDoubleEscapedDashDash(cp);
                break;
            }
            case State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN: {
                this._stateScriptDataDoubleEscapedLessThanSign(cp);
                break;
            }
            case State.SCRIPT_DATA_DOUBLE_ESCAPE_END: {
                this._stateScriptDataDoubleEscapeEnd(cp);
                break;
            }
            case State.BEFORE_ATTRIBUTE_NAME: {
                this._stateBeforeAttributeName(cp);
                break;
            }
            case State.ATTRIBUTE_NAME: {
                this._stateAttributeName(cp);
                break;
            }
            case State.AFTER_ATTRIBUTE_NAME: {
                this._stateAfterAttributeName(cp);
                break;
            }
            case State.BEFORE_ATTRIBUTE_VALUE: {
                this._stateBeforeAttributeValue(cp);
                break;
            }
            case State.ATTRIBUTE_VALUE_DOUBLE_QUOTED: {
                this._stateAttributeValueDoubleQuoted(cp);
                break;
            }
            case State.ATTRIBUTE_VALUE_SINGLE_QUOTED: {
                this._stateAttributeValueSingleQuoted(cp);
                break;
            }
            case State.ATTRIBUTE_VALUE_UNQUOTED: {
                this._stateAttributeValueUnquoted(cp);
                break;
            }
            case State.AFTER_ATTRIBUTE_VALUE_QUOTED: {
                this._stateAfterAttributeValueQuoted(cp);
                break;
            }
            case State.SELF_CLOSING_START_TAG: {
                this._stateSelfClosingStartTag(cp);
                break;
            }
            case State.BOGUS_COMMENT: {
                this._stateBogusComment(cp);
                break;
            }
            case State.MARKUP_DECLARATION_OPEN: {
                this._stateMarkupDeclarationOpen(cp);
                break;
            }
            case State.COMMENT_START: {
                this._stateCommentStart(cp);
                break;
            }
            case State.COMMENT_START_DASH: {
                this._stateCommentStartDash(cp);
                break;
            }
            case State.COMMENT: {
                this._stateComment(cp);
                break;
            }
            case State.COMMENT_LESS_THAN_SIGN: {
                this._stateCommentLessThanSign(cp);
                break;
            }
            case State.COMMENT_LESS_THAN_SIGN_BANG: {
                this._stateCommentLessThanSignBang(cp);
                break;
            }
            case State.COMMENT_LESS_THAN_SIGN_BANG_DASH: {
                this._stateCommentLessThanSignBangDash(cp);
                break;
            }
            case State.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH: {
                this._stateCommentLessThanSignBangDashDash(cp);
                break;
            }
            case State.COMMENT_END_DASH: {
                this._stateCommentEndDash(cp);
                break;
            }
            case State.COMMENT_END: {
                this._stateCommentEnd(cp);
                break;
            }
            case State.COMMENT_END_BANG: {
                this._stateCommentEndBang(cp);
                break;
            }
            case State.DOCTYPE: {
                this._stateDoctype(cp);
                break;
            }
            case State.BEFORE_DOCTYPE_NAME: {
                this._stateBeforeDoctypeName(cp);
                break;
            }
            case State.DOCTYPE_NAME: {
                this._stateDoctypeName(cp);
                break;
            }
            case State.AFTER_DOCTYPE_NAME: {
                this._stateAfterDoctypeName(cp);
                break;
            }
            case State.AFTER_DOCTYPE_PUBLIC_KEYWORD: {
                this._stateAfterDoctypePublicKeyword(cp);
                break;
            }
            case State.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER: {
                this._stateBeforeDoctypePublicIdentifier(cp);
                break;
            }
            case State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED: {
                this._stateDoctypePublicIdentifierDoubleQuoted(cp);
                break;
            }
            case State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED: {
                this._stateDoctypePublicIdentifierSingleQuoted(cp);
                break;
            }
            case State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER: {
                this._stateAfterDoctypePublicIdentifier(cp);
                break;
            }
            case State.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS: {
                this._stateBetweenDoctypePublicAndSystemIdentifiers(cp);
                break;
            }
            case State.AFTER_DOCTYPE_SYSTEM_KEYWORD: {
                this._stateAfterDoctypeSystemKeyword(cp);
                break;
            }
            case State.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER: {
                this._stateBeforeDoctypeSystemIdentifier(cp);
                break;
            }
            case State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED: {
                this._stateDoctypeSystemIdentifierDoubleQuoted(cp);
                break;
            }
            case State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED: {
                this._stateDoctypeSystemIdentifierSingleQuoted(cp);
                break;
            }
            case State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER: {
                this._stateAfterDoctypeSystemIdentifier(cp);
                break;
            }
            case State.BOGUS_DOCTYPE: {
                this._stateBogusDoctype(cp);
                break;
            }
            case State.CDATA_SECTION: {
                this._stateCdataSection(cp);
                break;
            }
            case State.CDATA_SECTION_BRACKET: {
                this._stateCdataSectionBracket(cp);
                break;
            }
            case State.CDATA_SECTION_END: {
                this._stateCdataSectionEnd(cp);
                break;
            }
            case State.CHARACTER_REFERENCE: {
                this._stateCharacterReference();
                break;
            }
            case State.AMBIGUOUS_AMPERSAND: {
                this._stateAmbiguousAmpersand(cp);
                break;
            }
            default: {
                throw new Error('Unknown state');
            }
        }
    }
    // State machine
    // Data state
    //------------------------------------------------------------------
    _stateData(cp) {
        switch (cp) {
            case CODE_POINTS.LESS_THAN_SIGN: {
                this.state = State.TAG_OPEN;
                break;
            }
            case CODE_POINTS.AMPERSAND: {
                this._startCharacterReference();
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this._emitCodePoint(cp);
                break;
            }
            case CODE_POINTS.EOF: {
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }
    //  RCDATA state
    //------------------------------------------------------------------
    _stateRcdata(cp) {
        switch (cp) {
            case CODE_POINTS.AMPERSAND: {
                this._startCharacterReference();
                break;
            }
            case CODE_POINTS.LESS_THAN_SIGN: {
                this.state = State.RCDATA_LESS_THAN_SIGN;
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this._emitChars(REPLACEMENT_CHARACTER);
                break;
            }
            case CODE_POINTS.EOF: {
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }
    // RAWTEXT state
    //------------------------------------------------------------------
    _stateRawtext(cp) {
        switch (cp) {
            case CODE_POINTS.LESS_THAN_SIGN: {
                this.state = State.RAWTEXT_LESS_THAN_SIGN;
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this._emitChars(REPLACEMENT_CHARACTER);
                break;
            }
            case CODE_POINTS.EOF: {
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }
    // Script data state
    //------------------------------------------------------------------
    _stateScriptData(cp) {
        switch (cp) {
            case CODE_POINTS.LESS_THAN_SIGN: {
                this.state = State.SCRIPT_DATA_LESS_THAN_SIGN;
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this._emitChars(REPLACEMENT_CHARACTER);
                break;
            }
            case CODE_POINTS.EOF: {
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }
    // PLAINTEXT state
    //------------------------------------------------------------------
    _statePlaintext(cp) {
        switch (cp) {
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this._emitChars(REPLACEMENT_CHARACTER);
                break;
            }
            case CODE_POINTS.EOF: {
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }
    // Tag open state
    //------------------------------------------------------------------
    _stateTagOpen(cp) {
        if (isAsciiLetter(cp)) {
            this._createStartTagToken();
            this.state = State.TAG_NAME;
            this._stateTagName(cp);
        }
        else
            switch (cp) {
                case CODE_POINTS.EXCLAMATION_MARK: {
                    this.state = State.MARKUP_DECLARATION_OPEN;
                    break;
                }
                case CODE_POINTS.SOLIDUS: {
                    this.state = State.END_TAG_OPEN;
                    break;
                }
                case CODE_POINTS.QUESTION_MARK: {
                    this._err(ERR.unexpectedQuestionMarkInsteadOfTagName);
                    this._createCommentToken(1);
                    this.state = State.BOGUS_COMMENT;
                    this._stateBogusComment(cp);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofBeforeTagName);
                    this._emitChars('<');
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._err(ERR.invalidFirstCharacterOfTagName);
                    this._emitChars('<');
                    this.state = State.DATA;
                    this._stateData(cp);
                }
            }
    }
    // End tag open state
    //------------------------------------------------------------------
    _stateEndTagOpen(cp) {
        if (isAsciiLetter(cp)) {
            this._createEndTagToken();
            this.state = State.TAG_NAME;
            this._stateTagName(cp);
        }
        else
            switch (cp) {
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this._err(ERR.missingEndTagName);
                    this.state = State.DATA;
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofBeforeTagName);
                    this._emitChars('</');
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._err(ERR.invalidFirstCharacterOfTagName);
                    this._createCommentToken(2);
                    this.state = State.BOGUS_COMMENT;
                    this._stateBogusComment(cp);
                }
            }
    }
    // Tag name state
    //------------------------------------------------------------------
    _stateTagName(cp) {
        const token = this.currentToken;
        switch (cp) {
            case CODE_POINTS.SPACE:
            case CODE_POINTS.LINE_FEED:
            case CODE_POINTS.TABULATION:
            case CODE_POINTS.FORM_FEED: {
                this.state = State.BEFORE_ATTRIBUTE_NAME;
                break;
            }
            case CODE_POINTS.SOLIDUS: {
                this.state = State.SELF_CLOSING_START_TAG;
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                this.emitCurrentTagToken();
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                token.tagName += REPLACEMENT_CHARACTER;
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInTag);
                this._emitEOFToken();
                break;
            }
            default: {
                token.tagName += String.fromCodePoint(isAsciiUpper(cp) ? toAsciiLower(cp) : cp);
            }
        }
    }
    // RCDATA less-than sign state
    //------------------------------------------------------------------
    _stateRcdataLessThanSign(cp) {
        if (cp === CODE_POINTS.SOLIDUS) {
            this.state = State.RCDATA_END_TAG_OPEN;
        }
        else {
            this._emitChars('<');
            this.state = State.RCDATA;
            this._stateRcdata(cp);
        }
    }
    // RCDATA end tag open state
    //------------------------------------------------------------------
    _stateRcdataEndTagOpen(cp) {
        if (isAsciiLetter(cp)) {
            this.state = State.RCDATA_END_TAG_NAME;
            this._stateRcdataEndTagName(cp);
        }
        else {
            this._emitChars('</');
            this.state = State.RCDATA;
            this._stateRcdata(cp);
        }
    }
    handleSpecialEndTag(_cp) {
        if (!this.preprocessor.startsWith(this.lastStartTagName, false)) {
            return !this._ensureHibernation();
        }
        this._createEndTagToken();
        const token = this.currentToken;
        token.tagName = this.lastStartTagName;
        const cp = this.preprocessor.peek(this.lastStartTagName.length);
        switch (cp) {
            case CODE_POINTS.SPACE:
            case CODE_POINTS.LINE_FEED:
            case CODE_POINTS.TABULATION:
            case CODE_POINTS.FORM_FEED: {
                this._advanceBy(this.lastStartTagName.length);
                this.state = State.BEFORE_ATTRIBUTE_NAME;
                return false;
            }
            case CODE_POINTS.SOLIDUS: {
                this._advanceBy(this.lastStartTagName.length);
                this.state = State.SELF_CLOSING_START_TAG;
                return false;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this._advanceBy(this.lastStartTagName.length);
                this.emitCurrentTagToken();
                this.state = State.DATA;
                return false;
            }
            default: {
                return !this._ensureHibernation();
            }
        }
    }
    // RCDATA end tag name state
    //------------------------------------------------------------------
    _stateRcdataEndTagName(cp) {
        if (this.handleSpecialEndTag(cp)) {
            this._emitChars('</');
            this.state = State.RCDATA;
            this._stateRcdata(cp);
        }
    }
    // RAWTEXT less-than sign state
    //------------------------------------------------------------------
    _stateRawtextLessThanSign(cp) {
        if (cp === CODE_POINTS.SOLIDUS) {
            this.state = State.RAWTEXT_END_TAG_OPEN;
        }
        else {
            this._emitChars('<');
            this.state = State.RAWTEXT;
            this._stateRawtext(cp);
        }
    }
    // RAWTEXT end tag open state
    //------------------------------------------------------------------
    _stateRawtextEndTagOpen(cp) {
        if (isAsciiLetter(cp)) {
            this.state = State.RAWTEXT_END_TAG_NAME;
            this._stateRawtextEndTagName(cp);
        }
        else {
            this._emitChars('</');
            this.state = State.RAWTEXT;
            this._stateRawtext(cp);
        }
    }
    // RAWTEXT end tag name state
    //------------------------------------------------------------------
    _stateRawtextEndTagName(cp) {
        if (this.handleSpecialEndTag(cp)) {
            this._emitChars('</');
            this.state = State.RAWTEXT;
            this._stateRawtext(cp);
        }
    }
    // Script data less-than sign state
    //------------------------------------------------------------------
    _stateScriptDataLessThanSign(cp) {
        switch (cp) {
            case CODE_POINTS.SOLIDUS: {
                this.state = State.SCRIPT_DATA_END_TAG_OPEN;
                break;
            }
            case CODE_POINTS.EXCLAMATION_MARK: {
                this.state = State.SCRIPT_DATA_ESCAPE_START;
                this._emitChars('<!');
                break;
            }
            default: {
                this._emitChars('<');
                this.state = State.SCRIPT_DATA;
                this._stateScriptData(cp);
            }
        }
    }
    // Script data end tag open state
    //------------------------------------------------------------------
    _stateScriptDataEndTagOpen(cp) {
        if (isAsciiLetter(cp)) {
            this.state = State.SCRIPT_DATA_END_TAG_NAME;
            this._stateScriptDataEndTagName(cp);
        }
        else {
            this._emitChars('</');
            this.state = State.SCRIPT_DATA;
            this._stateScriptData(cp);
        }
    }
    // Script data end tag name state
    //------------------------------------------------------------------
    _stateScriptDataEndTagName(cp) {
        if (this.handleSpecialEndTag(cp)) {
            this._emitChars('</');
            this.state = State.SCRIPT_DATA;
            this._stateScriptData(cp);
        }
    }
    // Script data escape start state
    //------------------------------------------------------------------
    _stateScriptDataEscapeStart(cp) {
        if (cp === CODE_POINTS.HYPHEN_MINUS) {
            this.state = State.SCRIPT_DATA_ESCAPE_START_DASH;
            this._emitChars('-');
        }
        else {
            this.state = State.SCRIPT_DATA;
            this._stateScriptData(cp);
        }
    }
    // Script data escape start dash state
    //------------------------------------------------------------------
    _stateScriptDataEscapeStartDash(cp) {
        if (cp === CODE_POINTS.HYPHEN_MINUS) {
            this.state = State.SCRIPT_DATA_ESCAPED_DASH_DASH;
            this._emitChars('-');
        }
        else {
            this.state = State.SCRIPT_DATA;
            this._stateScriptData(cp);
        }
    }
    // Script data escaped state
    //------------------------------------------------------------------
    _stateScriptDataEscaped(cp) {
        switch (cp) {
            case CODE_POINTS.HYPHEN_MINUS: {
                this.state = State.SCRIPT_DATA_ESCAPED_DASH;
                this._emitChars('-');
                break;
            }
            case CODE_POINTS.LESS_THAN_SIGN: {
                this.state = State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this._emitChars(REPLACEMENT_CHARACTER);
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInScriptHtmlCommentLikeText);
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }
    // Script data escaped dash state
    //------------------------------------------------------------------
    _stateScriptDataEscapedDash(cp) {
        switch (cp) {
            case CODE_POINTS.HYPHEN_MINUS: {
                this.state = State.SCRIPT_DATA_ESCAPED_DASH_DASH;
                this._emitChars('-');
                break;
            }
            case CODE_POINTS.LESS_THAN_SIGN: {
                this.state = State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this.state = State.SCRIPT_DATA_ESCAPED;
                this._emitChars(REPLACEMENT_CHARACTER);
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInScriptHtmlCommentLikeText);
                this._emitEOFToken();
                break;
            }
            default: {
                this.state = State.SCRIPT_DATA_ESCAPED;
                this._emitCodePoint(cp);
            }
        }
    }
    // Script data escaped dash dash state
    //------------------------------------------------------------------
    _stateScriptDataEscapedDashDash(cp) {
        switch (cp) {
            case CODE_POINTS.HYPHEN_MINUS: {
                this._emitChars('-');
                break;
            }
            case CODE_POINTS.LESS_THAN_SIGN: {
                this.state = State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this.state = State.SCRIPT_DATA;
                this._emitChars('>');
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this.state = State.SCRIPT_DATA_ESCAPED;
                this._emitChars(REPLACEMENT_CHARACTER);
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInScriptHtmlCommentLikeText);
                this._emitEOFToken();
                break;
            }
            default: {
                this.state = State.SCRIPT_DATA_ESCAPED;
                this._emitCodePoint(cp);
            }
        }
    }
    // Script data escaped less-than sign state
    //------------------------------------------------------------------
    _stateScriptDataEscapedLessThanSign(cp) {
        if (cp === CODE_POINTS.SOLIDUS) {
            this.state = State.SCRIPT_DATA_ESCAPED_END_TAG_OPEN;
        }
        else if (isAsciiLetter(cp)) {
            this._emitChars('<');
            this.state = State.SCRIPT_DATA_DOUBLE_ESCAPE_START;
            this._stateScriptDataDoubleEscapeStart(cp);
        }
        else {
            this._emitChars('<');
            this.state = State.SCRIPT_DATA_ESCAPED;
            this._stateScriptDataEscaped(cp);
        }
    }
    // Script data escaped end tag open state
    //------------------------------------------------------------------
    _stateScriptDataEscapedEndTagOpen(cp) {
        if (isAsciiLetter(cp)) {
            this.state = State.SCRIPT_DATA_ESCAPED_END_TAG_NAME;
            this._stateScriptDataEscapedEndTagName(cp);
        }
        else {
            this._emitChars('</');
            this.state = State.SCRIPT_DATA_ESCAPED;
            this._stateScriptDataEscaped(cp);
        }
    }
    // Script data escaped end tag name state
    //------------------------------------------------------------------
    _stateScriptDataEscapedEndTagName(cp) {
        if (this.handleSpecialEndTag(cp)) {
            this._emitChars('</');
            this.state = State.SCRIPT_DATA_ESCAPED;
            this._stateScriptDataEscaped(cp);
        }
    }
    // Script data double escape start state
    //------------------------------------------------------------------
    _stateScriptDataDoubleEscapeStart(cp) {
        if (this.preprocessor.startsWith(SEQUENCES.SCRIPT, false) &&
            isScriptDataDoubleEscapeSequenceEnd(this.preprocessor.peek(SEQUENCES.SCRIPT.length))) {
            this._emitCodePoint(cp);
            for (let i = 0; i < SEQUENCES.SCRIPT.length; i++) {
                this._emitCodePoint(this._consume());
            }
            this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
        }
        else if (!this._ensureHibernation()) {
            this.state = State.SCRIPT_DATA_ESCAPED;
            this._stateScriptDataEscaped(cp);
        }
    }
    // Script data double escaped state
    //------------------------------------------------------------------
    _stateScriptDataDoubleEscaped(cp) {
        switch (cp) {
            case CODE_POINTS.HYPHEN_MINUS: {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH;
                this._emitChars('-');
                break;
            }
            case CODE_POINTS.LESS_THAN_SIGN: {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
                this._emitChars('<');
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this._emitChars(REPLACEMENT_CHARACTER);
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInScriptHtmlCommentLikeText);
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }
    // Script data double escaped dash state
    //------------------------------------------------------------------
    _stateScriptDataDoubleEscapedDash(cp) {
        switch (cp) {
            case CODE_POINTS.HYPHEN_MINUS: {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH;
                this._emitChars('-');
                break;
            }
            case CODE_POINTS.LESS_THAN_SIGN: {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
                this._emitChars('<');
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
                this._emitChars(REPLACEMENT_CHARACTER);
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInScriptHtmlCommentLikeText);
                this._emitEOFToken();
                break;
            }
            default: {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
                this._emitCodePoint(cp);
            }
        }
    }
    // Script data double escaped dash dash state
    //------------------------------------------------------------------
    _stateScriptDataDoubleEscapedDashDash(cp) {
        switch (cp) {
            case CODE_POINTS.HYPHEN_MINUS: {
                this._emitChars('-');
                break;
            }
            case CODE_POINTS.LESS_THAN_SIGN: {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
                this._emitChars('<');
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this.state = State.SCRIPT_DATA;
                this._emitChars('>');
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
                this._emitChars(REPLACEMENT_CHARACTER);
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInScriptHtmlCommentLikeText);
                this._emitEOFToken();
                break;
            }
            default: {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
                this._emitCodePoint(cp);
            }
        }
    }
    // Script data double escaped less-than sign state
    //------------------------------------------------------------------
    _stateScriptDataDoubleEscapedLessThanSign(cp) {
        if (cp === CODE_POINTS.SOLIDUS) {
            this.state = State.SCRIPT_DATA_DOUBLE_ESCAPE_END;
            this._emitChars('/');
        }
        else {
            this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
            this._stateScriptDataDoubleEscaped(cp);
        }
    }
    // Script data double escape end state
    //------------------------------------------------------------------
    _stateScriptDataDoubleEscapeEnd(cp) {
        if (this.preprocessor.startsWith(SEQUENCES.SCRIPT, false) &&
            isScriptDataDoubleEscapeSequenceEnd(this.preprocessor.peek(SEQUENCES.SCRIPT.length))) {
            this._emitCodePoint(cp);
            for (let i = 0; i < SEQUENCES.SCRIPT.length; i++) {
                this._emitCodePoint(this._consume());
            }
            this.state = State.SCRIPT_DATA_ESCAPED;
        }
        else if (!this._ensureHibernation()) {
            this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
            this._stateScriptDataDoubleEscaped(cp);
        }
    }
    // Before attribute name state
    //------------------------------------------------------------------
    _stateBeforeAttributeName(cp) {
        switch (cp) {
            case CODE_POINTS.SPACE:
            case CODE_POINTS.LINE_FEED:
            case CODE_POINTS.TABULATION:
            case CODE_POINTS.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case CODE_POINTS.SOLIDUS:
            case CODE_POINTS.GREATER_THAN_SIGN:
            case CODE_POINTS.EOF: {
                this.state = State.AFTER_ATTRIBUTE_NAME;
                this._stateAfterAttributeName(cp);
                break;
            }
            case CODE_POINTS.EQUALS_SIGN: {
                this._err(ERR.unexpectedEqualsSignBeforeAttributeName);
                this._createAttr('=');
                this.state = State.ATTRIBUTE_NAME;
                break;
            }
            default: {
                this._createAttr('');
                this.state = State.ATTRIBUTE_NAME;
                this._stateAttributeName(cp);
            }
        }
    }
    // Attribute name state
    //------------------------------------------------------------------
    _stateAttributeName(cp) {
        switch (cp) {
            case CODE_POINTS.SPACE:
            case CODE_POINTS.LINE_FEED:
            case CODE_POINTS.TABULATION:
            case CODE_POINTS.FORM_FEED:
            case CODE_POINTS.SOLIDUS:
            case CODE_POINTS.GREATER_THAN_SIGN:
            case CODE_POINTS.EOF: {
                this._leaveAttrName();
                this.state = State.AFTER_ATTRIBUTE_NAME;
                this._stateAfterAttributeName(cp);
                break;
            }
            case CODE_POINTS.EQUALS_SIGN: {
                this._leaveAttrName();
                this.state = State.BEFORE_ATTRIBUTE_VALUE;
                break;
            }
            case CODE_POINTS.QUOTATION_MARK:
            case CODE_POINTS.APOSTROPHE:
            case CODE_POINTS.LESS_THAN_SIGN: {
                this._err(ERR.unexpectedCharacterInAttributeName);
                this.currentAttr.name += String.fromCodePoint(cp);
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this.currentAttr.name += REPLACEMENT_CHARACTER;
                break;
            }
            default: {
                this.currentAttr.name += String.fromCodePoint(isAsciiUpper(cp) ? toAsciiLower(cp) : cp);
            }
        }
    }
    // After attribute name state
    //------------------------------------------------------------------
    _stateAfterAttributeName(cp) {
        switch (cp) {
            case CODE_POINTS.SPACE:
            case CODE_POINTS.LINE_FEED:
            case CODE_POINTS.TABULATION:
            case CODE_POINTS.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case CODE_POINTS.SOLIDUS: {
                this.state = State.SELF_CLOSING_START_TAG;
                break;
            }
            case CODE_POINTS.EQUALS_SIGN: {
                this.state = State.BEFORE_ATTRIBUTE_VALUE;
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                this.emitCurrentTagToken();
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInTag);
                this._emitEOFToken();
                break;
            }
            default: {
                this._createAttr('');
                this.state = State.ATTRIBUTE_NAME;
                this._stateAttributeName(cp);
            }
        }
    }
    // Before attribute value state
    //------------------------------------------------------------------
    _stateBeforeAttributeValue(cp) {
        switch (cp) {
            case CODE_POINTS.SPACE:
            case CODE_POINTS.LINE_FEED:
            case CODE_POINTS.TABULATION:
            case CODE_POINTS.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case CODE_POINTS.QUOTATION_MARK: {
                this.state = State.ATTRIBUTE_VALUE_DOUBLE_QUOTED;
                break;
            }
            case CODE_POINTS.APOSTROPHE: {
                this.state = State.ATTRIBUTE_VALUE_SINGLE_QUOTED;
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(ERR.missingAttributeValue);
                this.state = State.DATA;
                this.emitCurrentTagToken();
                break;
            }
            default: {
                this.state = State.ATTRIBUTE_VALUE_UNQUOTED;
                this._stateAttributeValueUnquoted(cp);
            }
        }
    }
    // Attribute value (double-quoted) state
    //------------------------------------------------------------------
    _stateAttributeValueDoubleQuoted(cp) {
        switch (cp) {
            case CODE_POINTS.QUOTATION_MARK: {
                this.state = State.AFTER_ATTRIBUTE_VALUE_QUOTED;
                break;
            }
            case CODE_POINTS.AMPERSAND: {
                this._startCharacterReference();
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this.currentAttr.value += REPLACEMENT_CHARACTER;
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInTag);
                this._emitEOFToken();
                break;
            }
            default: {
                this.currentAttr.value += String.fromCodePoint(cp);
            }
        }
    }
    // Attribute value (single-quoted) state
    //------------------------------------------------------------------
    _stateAttributeValueSingleQuoted(cp) {
        switch (cp) {
            case CODE_POINTS.APOSTROPHE: {
                this.state = State.AFTER_ATTRIBUTE_VALUE_QUOTED;
                break;
            }
            case CODE_POINTS.AMPERSAND: {
                this._startCharacterReference();
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this.currentAttr.value += REPLACEMENT_CHARACTER;
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInTag);
                this._emitEOFToken();
                break;
            }
            default: {
                this.currentAttr.value += String.fromCodePoint(cp);
            }
        }
    }
    // Attribute value (unquoted) state
    //------------------------------------------------------------------
    _stateAttributeValueUnquoted(cp) {
        switch (cp) {
            case CODE_POINTS.SPACE:
            case CODE_POINTS.LINE_FEED:
            case CODE_POINTS.TABULATION:
            case CODE_POINTS.FORM_FEED: {
                this._leaveAttrValue();
                this.state = State.BEFORE_ATTRIBUTE_NAME;
                break;
            }
            case CODE_POINTS.AMPERSAND: {
                this._startCharacterReference();
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this._leaveAttrValue();
                this.state = State.DATA;
                this.emitCurrentTagToken();
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this.currentAttr.value += REPLACEMENT_CHARACTER;
                break;
            }
            case CODE_POINTS.QUOTATION_MARK:
            case CODE_POINTS.APOSTROPHE:
            case CODE_POINTS.LESS_THAN_SIGN:
            case CODE_POINTS.EQUALS_SIGN:
            case CODE_POINTS.GRAVE_ACCENT: {
                this._err(ERR.unexpectedCharacterInUnquotedAttributeValue);
                this.currentAttr.value += String.fromCodePoint(cp);
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInTag);
                this._emitEOFToken();
                break;
            }
            default: {
                this.currentAttr.value += String.fromCodePoint(cp);
            }
        }
    }
    // After attribute value (quoted) state
    //------------------------------------------------------------------
    _stateAfterAttributeValueQuoted(cp) {
        switch (cp) {
            case CODE_POINTS.SPACE:
            case CODE_POINTS.LINE_FEED:
            case CODE_POINTS.TABULATION:
            case CODE_POINTS.FORM_FEED: {
                this._leaveAttrValue();
                this.state = State.BEFORE_ATTRIBUTE_NAME;
                break;
            }
            case CODE_POINTS.SOLIDUS: {
                this._leaveAttrValue();
                this.state = State.SELF_CLOSING_START_TAG;
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this._leaveAttrValue();
                this.state = State.DATA;
                this.emitCurrentTagToken();
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInTag);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(ERR.missingWhitespaceBetweenAttributes);
                this.state = State.BEFORE_ATTRIBUTE_NAME;
                this._stateBeforeAttributeName(cp);
            }
        }
    }
    // Self-closing start tag state
    //------------------------------------------------------------------
    _stateSelfClosingStartTag(cp) {
        switch (cp) {
            case CODE_POINTS.GREATER_THAN_SIGN: {
                const token = this.currentToken;
                token.selfClosing = true;
                this.state = State.DATA;
                this.emitCurrentTagToken();
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInTag);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(ERR.unexpectedSolidusInTag);
                this.state = State.BEFORE_ATTRIBUTE_NAME;
                this._stateBeforeAttributeName(cp);
            }
        }
    }
    // Bogus comment state
    //------------------------------------------------------------------
    _stateBogusComment(cp) {
        const token = this.currentToken;
        switch (cp) {
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                this.emitCurrentComment(token);
                break;
            }
            case CODE_POINTS.EOF: {
                this.emitCurrentComment(token);
                this._emitEOFToken();
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                token.data += REPLACEMENT_CHARACTER;
                break;
            }
            default: {
                token.data += String.fromCodePoint(cp);
            }
        }
    }
    // Markup declaration open state
    //------------------------------------------------------------------
    _stateMarkupDeclarationOpen(cp) {
        if (this._consumeSequenceIfMatch(SEQUENCES.DASH_DASH, true)) {
            this._createCommentToken(SEQUENCES.DASH_DASH.length + 1);
            this.state = State.COMMENT_START;
        }
        else if (this._consumeSequenceIfMatch(SEQUENCES.DOCTYPE, false)) {
            // NOTE: Doctypes tokens are created without fixed offsets. We keep track of the moment a doctype *might* start here.
            this.currentLocation = this.getCurrentLocation(SEQUENCES.DOCTYPE.length + 1);
            this.state = State.DOCTYPE;
        }
        else if (this._consumeSequenceIfMatch(SEQUENCES.CDATA_START, true)) {
            if (this.inForeignNode) {
                this.state = State.CDATA_SECTION;
            }
            else {
                this._err(ERR.cdataInHtmlContent);
                this._createCommentToken(SEQUENCES.CDATA_START.length + 1);
                this.currentToken.data = '[CDATA[';
                this.state = State.BOGUS_COMMENT;
            }
        }
        //NOTE: Sequence lookups can be abrupted by hibernation. In that case, lookup
        //results are no longer valid and we will need to start over.
        else if (!this._ensureHibernation()) {
            this._err(ERR.incorrectlyOpenedComment);
            this._createCommentToken(2);
            this.state = State.BOGUS_COMMENT;
            this._stateBogusComment(cp);
        }
    }
    // Comment start state
    //------------------------------------------------------------------
    _stateCommentStart(cp) {
        switch (cp) {
            case CODE_POINTS.HYPHEN_MINUS: {
                this.state = State.COMMENT_START_DASH;
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(ERR.abruptClosingOfEmptyComment);
                this.state = State.DATA;
                const token = this.currentToken;
                this.emitCurrentComment(token);
                break;
            }
            default: {
                this.state = State.COMMENT;
                this._stateComment(cp);
            }
        }
    }
    // Comment start dash state
    //------------------------------------------------------------------
    _stateCommentStartDash(cp) {
        const token = this.currentToken;
        switch (cp) {
            case CODE_POINTS.HYPHEN_MINUS: {
                this.state = State.COMMENT_END;
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(ERR.abruptClosingOfEmptyComment);
                this.state = State.DATA;
                this.emitCurrentComment(token);
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInComment);
                this.emitCurrentComment(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.data += '-';
                this.state = State.COMMENT;
                this._stateComment(cp);
            }
        }
    }
    // Comment state
    //------------------------------------------------------------------
    _stateComment(cp) {
        const token = this.currentToken;
        switch (cp) {
            case CODE_POINTS.HYPHEN_MINUS: {
                this.state = State.COMMENT_END_DASH;
                break;
            }
            case CODE_POINTS.LESS_THAN_SIGN: {
                token.data += '<';
                this.state = State.COMMENT_LESS_THAN_SIGN;
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                token.data += REPLACEMENT_CHARACTER;
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInComment);
                this.emitCurrentComment(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.data += String.fromCodePoint(cp);
            }
        }
    }
    // Comment less-than sign state
    //------------------------------------------------------------------
    _stateCommentLessThanSign(cp) {
        const token = this.currentToken;
        switch (cp) {
            case CODE_POINTS.EXCLAMATION_MARK: {
                token.data += '!';
                this.state = State.COMMENT_LESS_THAN_SIGN_BANG;
                break;
            }
            case CODE_POINTS.LESS_THAN_SIGN: {
                token.data += '<';
                break;
            }
            default: {
                this.state = State.COMMENT;
                this._stateComment(cp);
            }
        }
    }
    // Comment less-than sign bang state
    //------------------------------------------------------------------
    _stateCommentLessThanSignBang(cp) {
        if (cp === CODE_POINTS.HYPHEN_MINUS) {
            this.state = State.COMMENT_LESS_THAN_SIGN_BANG_DASH;
        }
        else {
            this.state = State.COMMENT;
            this._stateComment(cp);
        }
    }
    // Comment less-than sign bang dash state
    //------------------------------------------------------------------
    _stateCommentLessThanSignBangDash(cp) {
        if (cp === CODE_POINTS.HYPHEN_MINUS) {
            this.state = State.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH;
        }
        else {
            this.state = State.COMMENT_END_DASH;
            this._stateCommentEndDash(cp);
        }
    }
    // Comment less-than sign bang dash dash state
    //------------------------------------------------------------------
    _stateCommentLessThanSignBangDashDash(cp) {
        if (cp !== CODE_POINTS.GREATER_THAN_SIGN && cp !== CODE_POINTS.EOF) {
            this._err(ERR.nestedComment);
        }
        this.state = State.COMMENT_END;
        this._stateCommentEnd(cp);
    }
    // Comment end dash state
    //------------------------------------------------------------------
    _stateCommentEndDash(cp) {
        const token = this.currentToken;
        switch (cp) {
            case CODE_POINTS.HYPHEN_MINUS: {
                this.state = State.COMMENT_END;
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInComment);
                this.emitCurrentComment(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.data += '-';
                this.state = State.COMMENT;
                this._stateComment(cp);
            }
        }
    }
    // Comment end state
    //------------------------------------------------------------------
    _stateCommentEnd(cp) {
        const token = this.currentToken;
        switch (cp) {
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                this.emitCurrentComment(token);
                break;
            }
            case CODE_POINTS.EXCLAMATION_MARK: {
                this.state = State.COMMENT_END_BANG;
                break;
            }
            case CODE_POINTS.HYPHEN_MINUS: {
                token.data += '-';
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInComment);
                this.emitCurrentComment(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.data += '--';
                this.state = State.COMMENT;
                this._stateComment(cp);
            }
        }
    }
    // Comment end bang state
    //------------------------------------------------------------------
    _stateCommentEndBang(cp) {
        const token = this.currentToken;
        switch (cp) {
            case CODE_POINTS.HYPHEN_MINUS: {
                token.data += '--!';
                this.state = State.COMMENT_END_DASH;
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(ERR.incorrectlyClosedComment);
                this.state = State.DATA;
                this.emitCurrentComment(token);
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInComment);
                this.emitCurrentComment(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.data += '--!';
                this.state = State.COMMENT;
                this._stateComment(cp);
            }
        }
    }
    // DOCTYPE state
    //------------------------------------------------------------------
    _stateDoctype(cp) {
        switch (cp) {
            case CODE_POINTS.SPACE:
            case CODE_POINTS.LINE_FEED:
            case CODE_POINTS.TABULATION:
            case CODE_POINTS.FORM_FEED: {
                this.state = State.BEFORE_DOCTYPE_NAME;
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this.state = State.BEFORE_DOCTYPE_NAME;
                this._stateBeforeDoctypeName(cp);
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInDoctype);
                this._createDoctypeToken(null);
                const token = this.currentToken;
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(ERR.missingWhitespaceBeforeDoctypeName);
                this.state = State.BEFORE_DOCTYPE_NAME;
                this._stateBeforeDoctypeName(cp);
            }
        }
    }
    // Before DOCTYPE name state
    //------------------------------------------------------------------
    _stateBeforeDoctypeName(cp) {
        if (isAsciiUpper(cp)) {
            this._createDoctypeToken(String.fromCharCode(toAsciiLower(cp)));
            this.state = State.DOCTYPE_NAME;
        }
        else
            switch (cp) {
                case CODE_POINTS.SPACE:
                case CODE_POINTS.LINE_FEED:
                case CODE_POINTS.TABULATION:
                case CODE_POINTS.FORM_FEED: {
                    // Ignore whitespace
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    this._createDoctypeToken(REPLACEMENT_CHARACTER);
                    this.state = State.DOCTYPE_NAME;
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this._err(ERR.missingDoctypeName);
                    this._createDoctypeToken(null);
                    const token = this.currentToken;
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this.state = State.DATA;
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInDoctype);
                    this._createDoctypeToken(null);
                    const token = this.currentToken;
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._createDoctypeToken(String.fromCodePoint(cp));
                    this.state = State.DOCTYPE_NAME;
                }
            }
    }
    // DOCTYPE name state
    //------------------------------------------------------------------
    _stateDoctypeName(cp) {
        const token = this.currentToken;
        switch (cp) {
            case CODE_POINTS.SPACE:
            case CODE_POINTS.LINE_FEED:
            case CODE_POINTS.TABULATION:
            case CODE_POINTS.FORM_FEED: {
                this.state = State.AFTER_DOCTYPE_NAME;
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                this.emitCurrentDoctype(token);
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                token.name += REPLACEMENT_CHARACTER;
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.name += String.fromCodePoint(isAsciiUpper(cp) ? toAsciiLower(cp) : cp);
            }
        }
    }
    // After DOCTYPE name state
    //------------------------------------------------------------------
    _stateAfterDoctypeName(cp) {
        const token = this.currentToken;
        switch (cp) {
            case CODE_POINTS.SPACE:
            case CODE_POINTS.LINE_FEED:
            case CODE_POINTS.TABULATION:
            case CODE_POINTS.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                this.emitCurrentDoctype(token);
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                if (this._consumeSequenceIfMatch(SEQUENCES.PUBLIC, false)) {
                    this.state = State.AFTER_DOCTYPE_PUBLIC_KEYWORD;
                }
                else if (this._consumeSequenceIfMatch(SEQUENCES.SYSTEM, false)) {
                    this.state = State.AFTER_DOCTYPE_SYSTEM_KEYWORD;
                }
                //NOTE: sequence lookup can be abrupted by hibernation. In that case lookup
                //results are no longer valid and we will need to start over.
                else if (!this._ensureHibernation()) {
                    this._err(ERR.invalidCharacterSequenceAfterDoctypeName);
                    token.forceQuirks = true;
                    this.state = State.BOGUS_DOCTYPE;
                    this._stateBogusDoctype(cp);
                }
            }
        }
    }
    // After DOCTYPE public keyword state
    //------------------------------------------------------------------
    _stateAfterDoctypePublicKeyword(cp) {
        const token = this.currentToken;
        switch (cp) {
            case CODE_POINTS.SPACE:
            case CODE_POINTS.LINE_FEED:
            case CODE_POINTS.TABULATION:
            case CODE_POINTS.FORM_FEED: {
                this.state = State.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER;
                break;
            }
            case CODE_POINTS.QUOTATION_MARK: {
                this._err(ERR.missingWhitespaceAfterDoctypePublicKeyword);
                token.publicId = '';
                this.state = State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED;
                break;
            }
            case CODE_POINTS.APOSTROPHE: {
                this._err(ERR.missingWhitespaceAfterDoctypePublicKeyword);
                token.publicId = '';
                this.state = State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(ERR.missingDoctypePublicIdentifier);
                token.forceQuirks = true;
                this.state = State.DATA;
                this.emitCurrentDoctype(token);
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(ERR.missingQuoteBeforeDoctypePublicIdentifier);
                token.forceQuirks = true;
                this.state = State.BOGUS_DOCTYPE;
                this._stateBogusDoctype(cp);
            }
        }
    }
    // Before DOCTYPE public identifier state
    //------------------------------------------------------------------
    _stateBeforeDoctypePublicIdentifier(cp) {
        const token = this.currentToken;
        switch (cp) {
            case CODE_POINTS.SPACE:
            case CODE_POINTS.LINE_FEED:
            case CODE_POINTS.TABULATION:
            case CODE_POINTS.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case CODE_POINTS.QUOTATION_MARK: {
                token.publicId = '';
                this.state = State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED;
                break;
            }
            case CODE_POINTS.APOSTROPHE: {
                token.publicId = '';
                this.state = State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(ERR.missingDoctypePublicIdentifier);
                token.forceQuirks = true;
                this.state = State.DATA;
                this.emitCurrentDoctype(token);
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(ERR.missingQuoteBeforeDoctypePublicIdentifier);
                token.forceQuirks = true;
                this.state = State.BOGUS_DOCTYPE;
                this._stateBogusDoctype(cp);
            }
        }
    }
    // DOCTYPE public identifier (double-quoted) state
    //------------------------------------------------------------------
    _stateDoctypePublicIdentifierDoubleQuoted(cp) {
        const token = this.currentToken;
        switch (cp) {
            case CODE_POINTS.QUOTATION_MARK: {
                this.state = State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER;
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                token.publicId += REPLACEMENT_CHARACTER;
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(ERR.abruptDoctypePublicIdentifier);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this.state = State.DATA;
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.publicId += String.fromCodePoint(cp);
            }
        }
    }
    // DOCTYPE public identifier (single-quoted) state
    //------------------------------------------------------------------
    _stateDoctypePublicIdentifierSingleQuoted(cp) {
        const token = this.currentToken;
        switch (cp) {
            case CODE_POINTS.APOSTROPHE: {
                this.state = State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER;
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                token.publicId += REPLACEMENT_CHARACTER;
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(ERR.abruptDoctypePublicIdentifier);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this.state = State.DATA;
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.publicId += String.fromCodePoint(cp);
            }
        }
    }
    // After DOCTYPE public identifier state
    //------------------------------------------------------------------
    _stateAfterDoctypePublicIdentifier(cp) {
        const token = this.currentToken;
        switch (cp) {
            case CODE_POINTS.SPACE:
            case CODE_POINTS.LINE_FEED:
            case CODE_POINTS.TABULATION:
            case CODE_POINTS.FORM_FEED: {
                this.state = State.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS;
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                this.emitCurrentDoctype(token);
                break;
            }
            case CODE_POINTS.QUOTATION_MARK: {
                this._err(ERR.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers);
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
                break;
            }
            case CODE_POINTS.APOSTROPHE: {
                this._err(ERR.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers);
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.state = State.BOGUS_DOCTYPE;
                this._stateBogusDoctype(cp);
            }
        }
    }
    // Between DOCTYPE public and system identifiers state
    //------------------------------------------------------------------
    _stateBetweenDoctypePublicAndSystemIdentifiers(cp) {
        const token = this.currentToken;
        switch (cp) {
            case CODE_POINTS.SPACE:
            case CODE_POINTS.LINE_FEED:
            case CODE_POINTS.TABULATION:
            case CODE_POINTS.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this.emitCurrentDoctype(token);
                this.state = State.DATA;
                break;
            }
            case CODE_POINTS.QUOTATION_MARK: {
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
                break;
            }
            case CODE_POINTS.APOSTROPHE: {
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.state = State.BOGUS_DOCTYPE;
                this._stateBogusDoctype(cp);
            }
        }
    }
    // After DOCTYPE system keyword state
    //------------------------------------------------------------------
    _stateAfterDoctypeSystemKeyword(cp) {
        const token = this.currentToken;
        switch (cp) {
            case CODE_POINTS.SPACE:
            case CODE_POINTS.LINE_FEED:
            case CODE_POINTS.TABULATION:
            case CODE_POINTS.FORM_FEED: {
                this.state = State.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER;
                break;
            }
            case CODE_POINTS.QUOTATION_MARK: {
                this._err(ERR.missingWhitespaceAfterDoctypeSystemKeyword);
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
                break;
            }
            case CODE_POINTS.APOSTROPHE: {
                this._err(ERR.missingWhitespaceAfterDoctypeSystemKeyword);
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(ERR.missingDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.state = State.DATA;
                this.emitCurrentDoctype(token);
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.state = State.BOGUS_DOCTYPE;
                this._stateBogusDoctype(cp);
            }
        }
    }
    // Before DOCTYPE system identifier state
    //------------------------------------------------------------------
    _stateBeforeDoctypeSystemIdentifier(cp) {
        const token = this.currentToken;
        switch (cp) {
            case CODE_POINTS.SPACE:
            case CODE_POINTS.LINE_FEED:
            case CODE_POINTS.TABULATION:
            case CODE_POINTS.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case CODE_POINTS.QUOTATION_MARK: {
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
                break;
            }
            case CODE_POINTS.APOSTROPHE: {
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(ERR.missingDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.state = State.DATA;
                this.emitCurrentDoctype(token);
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.state = State.BOGUS_DOCTYPE;
                this._stateBogusDoctype(cp);
            }
        }
    }
    // DOCTYPE system identifier (double-quoted) state
    //------------------------------------------------------------------
    _stateDoctypeSystemIdentifierDoubleQuoted(cp) {
        const token = this.currentToken;
        switch (cp) {
            case CODE_POINTS.QUOTATION_MARK: {
                this.state = State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER;
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                token.systemId += REPLACEMENT_CHARACTER;
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(ERR.abruptDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this.state = State.DATA;
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.systemId += String.fromCodePoint(cp);
            }
        }
    }
    // DOCTYPE system identifier (single-quoted) state
    //------------------------------------------------------------------
    _stateDoctypeSystemIdentifierSingleQuoted(cp) {
        const token = this.currentToken;
        switch (cp) {
            case CODE_POINTS.APOSTROPHE: {
                this.state = State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER;
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                token.systemId += REPLACEMENT_CHARACTER;
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(ERR.abruptDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this.state = State.DATA;
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.systemId += String.fromCodePoint(cp);
            }
        }
    }
    // After DOCTYPE system identifier state
    //------------------------------------------------------------------
    _stateAfterDoctypeSystemIdentifier(cp) {
        const token = this.currentToken;
        switch (cp) {
            case CODE_POINTS.SPACE:
            case CODE_POINTS.LINE_FEED:
            case CODE_POINTS.TABULATION:
            case CODE_POINTS.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this.emitCurrentDoctype(token);
                this.state = State.DATA;
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(ERR.unexpectedCharacterAfterDoctypeSystemIdentifier);
                this.state = State.BOGUS_DOCTYPE;
                this._stateBogusDoctype(cp);
            }
        }
    }
    // Bogus DOCTYPE state
    //------------------------------------------------------------------
    _stateBogusDoctype(cp) {
        const token = this.currentToken;
        switch (cp) {
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this.emitCurrentDoctype(token);
                this.state = State.DATA;
                break;
            }
            case CODE_POINTS.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                break;
            }
            case CODE_POINTS.EOF: {
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            // Do nothing
        }
    }
    // CDATA section state
    //------------------------------------------------------------------
    _stateCdataSection(cp) {
        switch (cp) {
            case CODE_POINTS.RIGHT_SQUARE_BRACKET: {
                this.state = State.CDATA_SECTION_BRACKET;
                break;
            }
            case CODE_POINTS.EOF: {
                this._err(ERR.eofInCdata);
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }
    // CDATA section bracket state
    //------------------------------------------------------------------
    _stateCdataSectionBracket(cp) {
        if (cp === CODE_POINTS.RIGHT_SQUARE_BRACKET) {
            this.state = State.CDATA_SECTION_END;
        }
        else {
            this._emitChars(']');
            this.state = State.CDATA_SECTION;
            this._stateCdataSection(cp);
        }
    }
    // CDATA section end state
    //------------------------------------------------------------------
    _stateCdataSectionEnd(cp) {
        switch (cp) {
            case CODE_POINTS.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                break;
            }
            case CODE_POINTS.RIGHT_SQUARE_BRACKET: {
                this._emitChars(']');
                break;
            }
            default: {
                this._emitChars(']]');
                this.state = State.CDATA_SECTION;
                this._stateCdataSection(cp);
            }
        }
    }
    // Character reference state
    //------------------------------------------------------------------
    _stateCharacterReference() {
        let length = this.entityDecoder.write(this.preprocessor.html, this.preprocessor.pos);
        if (length < 0) {
            if (this.preprocessor.lastChunkWritten) {
                length = this.entityDecoder.end();
            }
            else {
                // Wait for the rest of the entity.
                this.active = false;
                // Mark the entire buffer as read.
                this.preprocessor.pos = this.preprocessor.html.length - 1;
                this.consumedAfterSnapshot = 0;
                this.preprocessor.endOfChunkHit = true;
                return;
            }
        }
        if (length === 0) {
            // This was not a valid entity. Go back to the beginning, and
            // figure out what to do.
            this.preprocessor.pos = this.entityStartPos;
            this._flushCodePointConsumedAsCharacterReference(CODE_POINTS.AMPERSAND);
            this.state =
                !this._isCharacterReferenceInAttribute() && isAsciiAlphaNumeric(this.preprocessor.peek(1))
                    ? State.AMBIGUOUS_AMPERSAND
                    : this.returnState;
        }
        else {
            // We successfully parsed an entity. Switch to the return state.
            this.state = this.returnState;
        }
    }
    // Ambiguos ampersand state
    //------------------------------------------------------------------
    _stateAmbiguousAmpersand(cp) {
        if (isAsciiAlphaNumeric(cp)) {
            this._flushCodePointConsumedAsCharacterReference(cp);
        }
        else {
            if (cp === CODE_POINTS.SEMICOLON) {
                this._err(ERR.unknownNamedCharacterReference);
            }
            this.state = this.returnState;
            this._callState(cp);
        }
    }
}

//Element utils
const IMPLICIT_END_TAG_REQUIRED = new Set([TAG_ID.DD, TAG_ID.DT, TAG_ID.LI, TAG_ID.OPTGROUP, TAG_ID.OPTION, TAG_ID.P, TAG_ID.RB, TAG_ID.RP, TAG_ID.RT, TAG_ID.RTC]);
const IMPLICIT_END_TAG_REQUIRED_THOROUGHLY = new Set([
    ...IMPLICIT_END_TAG_REQUIRED,
    TAG_ID.CAPTION,
    TAG_ID.COLGROUP,
    TAG_ID.TBODY,
    TAG_ID.TD,
    TAG_ID.TFOOT,
    TAG_ID.TH,
    TAG_ID.THEAD,
    TAG_ID.TR,
]);
const SCOPING_ELEMENTS_HTML = new Set([
    TAG_ID.APPLET,
    TAG_ID.CAPTION,
    TAG_ID.HTML,
    TAG_ID.MARQUEE,
    TAG_ID.OBJECT,
    TAG_ID.TABLE,
    TAG_ID.TD,
    TAG_ID.TEMPLATE,
    TAG_ID.TH,
]);
const SCOPING_ELEMENTS_HTML_LIST = new Set([...SCOPING_ELEMENTS_HTML, TAG_ID.OL, TAG_ID.UL]);
const SCOPING_ELEMENTS_HTML_BUTTON = new Set([...SCOPING_ELEMENTS_HTML, TAG_ID.BUTTON]);
const SCOPING_ELEMENTS_MATHML = new Set([TAG_ID.ANNOTATION_XML, TAG_ID.MI, TAG_ID.MN, TAG_ID.MO, TAG_ID.MS, TAG_ID.MTEXT]);
const SCOPING_ELEMENTS_SVG = new Set([TAG_ID.DESC, TAG_ID.FOREIGN_OBJECT, TAG_ID.TITLE]);
const TABLE_ROW_CONTEXT = new Set([TAG_ID.TR, TAG_ID.TEMPLATE, TAG_ID.HTML]);
const TABLE_BODY_CONTEXT = new Set([TAG_ID.TBODY, TAG_ID.TFOOT, TAG_ID.THEAD, TAG_ID.TEMPLATE, TAG_ID.HTML]);
const TABLE_CONTEXT = new Set([TAG_ID.TABLE, TAG_ID.TEMPLATE, TAG_ID.HTML]);
const TABLE_CELLS = new Set([TAG_ID.TD, TAG_ID.TH]);
//Stack of open elements
class OpenElementStack {
    get currentTmplContentOrNode() {
        return this._isInTemplate() ? this.treeAdapter.getTemplateContent(this.current) : this.current;
    }
    constructor(document, treeAdapter, handler) {
        this.treeAdapter = treeAdapter;
        this.handler = handler;
        this.items = [];
        this.tagIDs = [];
        this.stackTop = -1;
        this.tmplCount = 0;
        this.currentTagId = TAG_ID.UNKNOWN;
        this.current = document;
    }
    //Index of element
    _indexOf(element) {
        return this.items.lastIndexOf(element, this.stackTop);
    }
    //Update current element
    _isInTemplate() {
        return this.currentTagId === TAG_ID.TEMPLATE && this.treeAdapter.getNamespaceURI(this.current) === NS.HTML;
    }
    _updateCurrentElement() {
        this.current = this.items[this.stackTop];
        this.currentTagId = this.tagIDs[this.stackTop];
    }
    //Mutations
    push(element, tagID) {
        this.stackTop++;
        this.items[this.stackTop] = element;
        this.current = element;
        this.tagIDs[this.stackTop] = tagID;
        this.currentTagId = tagID;
        if (this._isInTemplate()) {
            this.tmplCount++;
        }
        this.handler.onItemPush(element, tagID, true);
    }
    pop() {
        const popped = this.current;
        if (this.tmplCount > 0 && this._isInTemplate()) {
            this.tmplCount--;
        }
        this.stackTop--;
        this._updateCurrentElement();
        this.handler.onItemPop(popped, true);
    }
    replace(oldElement, newElement) {
        const idx = this._indexOf(oldElement);
        this.items[idx] = newElement;
        if (idx === this.stackTop) {
            this.current = newElement;
        }
    }
    insertAfter(referenceElement, newElement, newElementID) {
        const insertionIdx = this._indexOf(referenceElement) + 1;
        this.items.splice(insertionIdx, 0, newElement);
        this.tagIDs.splice(insertionIdx, 0, newElementID);
        this.stackTop++;
        if (insertionIdx === this.stackTop) {
            this._updateCurrentElement();
        }
        if (this.current && this.currentTagId !== undefined) {
            this.handler.onItemPush(this.current, this.currentTagId, insertionIdx === this.stackTop);
        }
    }
    popUntilTagNamePopped(tagName) {
        let targetIdx = this.stackTop + 1;
        do {
            targetIdx = this.tagIDs.lastIndexOf(tagName, targetIdx - 1);
        } while (targetIdx > 0 && this.treeAdapter.getNamespaceURI(this.items[targetIdx]) !== NS.HTML);
        this.shortenToLength(Math.max(targetIdx, 0));
    }
    shortenToLength(idx) {
        while (this.stackTop >= idx) {
            const popped = this.current;
            if (this.tmplCount > 0 && this._isInTemplate()) {
                this.tmplCount -= 1;
            }
            this.stackTop--;
            this._updateCurrentElement();
            this.handler.onItemPop(popped, this.stackTop < idx);
        }
    }
    popUntilElementPopped(element) {
        const idx = this._indexOf(element);
        this.shortenToLength(Math.max(idx, 0));
    }
    popUntilPopped(tagNames, targetNS) {
        const idx = this._indexOfTagNames(tagNames, targetNS);
        this.shortenToLength(Math.max(idx, 0));
    }
    popUntilNumberedHeaderPopped() {
        this.popUntilPopped(NUMBERED_HEADERS, NS.HTML);
    }
    popUntilTableCellPopped() {
        this.popUntilPopped(TABLE_CELLS, NS.HTML);
    }
    popAllUpToHtmlElement() {
        //NOTE: here we assume that the root <html> element is always first in the open element stack, so
        //we perform this fast stack clean up.
        this.tmplCount = 0;
        this.shortenToLength(1);
    }
    _indexOfTagNames(tagNames, namespace) {
        for (let i = this.stackTop; i >= 0; i--) {
            if (tagNames.has(this.tagIDs[i]) && this.treeAdapter.getNamespaceURI(this.items[i]) === namespace) {
                return i;
            }
        }
        return -1;
    }
    clearBackTo(tagNames, targetNS) {
        const idx = this._indexOfTagNames(tagNames, targetNS);
        this.shortenToLength(idx + 1);
    }
    clearBackToTableContext() {
        this.clearBackTo(TABLE_CONTEXT, NS.HTML);
    }
    clearBackToTableBodyContext() {
        this.clearBackTo(TABLE_BODY_CONTEXT, NS.HTML);
    }
    clearBackToTableRowContext() {
        this.clearBackTo(TABLE_ROW_CONTEXT, NS.HTML);
    }
    remove(element) {
        const idx = this._indexOf(element);
        if (idx >= 0) {
            if (idx === this.stackTop) {
                this.pop();
            }
            else {
                this.items.splice(idx, 1);
                this.tagIDs.splice(idx, 1);
                this.stackTop--;
                this._updateCurrentElement();
                this.handler.onItemPop(element, false);
            }
        }
    }
    //Search
    tryPeekProperlyNestedBodyElement() {
        //Properly nested <body> element (should be second element in stack).
        return this.stackTop >= 1 && this.tagIDs[1] === TAG_ID.BODY ? this.items[1] : null;
    }
    contains(element) {
        return this._indexOf(element) > -1;
    }
    getCommonAncestor(element) {
        const elementIdx = this._indexOf(element) - 1;
        return elementIdx >= 0 ? this.items[elementIdx] : null;
    }
    isRootHtmlElementCurrent() {
        return this.stackTop === 0 && this.tagIDs[0] === TAG_ID.HTML;
    }
    //Element in scope
    hasInDynamicScope(tagName, htmlScope) {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.tagIDs[i];
            switch (this.treeAdapter.getNamespaceURI(this.items[i])) {
                case NS.HTML: {
                    if (tn === tagName)
                        return true;
                    if (htmlScope.has(tn))
                        return false;
                    break;
                }
                case NS.SVG: {
                    if (SCOPING_ELEMENTS_SVG.has(tn))
                        return false;
                    break;
                }
                case NS.MATHML: {
                    if (SCOPING_ELEMENTS_MATHML.has(tn))
                        return false;
                    break;
                }
            }
        }
        return true;
    }
    hasInScope(tagName) {
        return this.hasInDynamicScope(tagName, SCOPING_ELEMENTS_HTML);
    }
    hasInListItemScope(tagName) {
        return this.hasInDynamicScope(tagName, SCOPING_ELEMENTS_HTML_LIST);
    }
    hasInButtonScope(tagName) {
        return this.hasInDynamicScope(tagName, SCOPING_ELEMENTS_HTML_BUTTON);
    }
    hasNumberedHeaderInScope() {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.tagIDs[i];
            switch (this.treeAdapter.getNamespaceURI(this.items[i])) {
                case NS.HTML: {
                    if (NUMBERED_HEADERS.has(tn))
                        return true;
                    if (SCOPING_ELEMENTS_HTML.has(tn))
                        return false;
                    break;
                }
                case NS.SVG: {
                    if (SCOPING_ELEMENTS_SVG.has(tn))
                        return false;
                    break;
                }
                case NS.MATHML: {
                    if (SCOPING_ELEMENTS_MATHML.has(tn))
                        return false;
                    break;
                }
            }
        }
        return true;
    }
    hasInTableScope(tagName) {
        for (let i = this.stackTop; i >= 0; i--) {
            if (this.treeAdapter.getNamespaceURI(this.items[i]) !== NS.HTML) {
                continue;
            }
            switch (this.tagIDs[i]) {
                case tagName: {
                    return true;
                }
                case TAG_ID.TABLE:
                case TAG_ID.HTML: {
                    return false;
                }
            }
        }
        return true;
    }
    hasTableBodyContextInTableScope() {
        for (let i = this.stackTop; i >= 0; i--) {
            if (this.treeAdapter.getNamespaceURI(this.items[i]) !== NS.HTML) {
                continue;
            }
            switch (this.tagIDs[i]) {
                case TAG_ID.TBODY:
                case TAG_ID.THEAD:
                case TAG_ID.TFOOT: {
                    return true;
                }
                case TAG_ID.TABLE:
                case TAG_ID.HTML: {
                    return false;
                }
            }
        }
        return true;
    }
    hasInSelectScope(tagName) {
        for (let i = this.stackTop; i >= 0; i--) {
            if (this.treeAdapter.getNamespaceURI(this.items[i]) !== NS.HTML) {
                continue;
            }
            switch (this.tagIDs[i]) {
                case tagName: {
                    return true;
                }
                case TAG_ID.OPTION:
                case TAG_ID.OPTGROUP: {
                    break;
                }
                default: {
                    return false;
                }
            }
        }
        return true;
    }
    //Implied end tags
    generateImpliedEndTags() {
        while (this.currentTagId !== undefined && IMPLICIT_END_TAG_REQUIRED.has(this.currentTagId)) {
            this.pop();
        }
    }
    generateImpliedEndTagsThoroughly() {
        while (this.currentTagId !== undefined && IMPLICIT_END_TAG_REQUIRED_THOROUGHLY.has(this.currentTagId)) {
            this.pop();
        }
    }
    generateImpliedEndTagsWithExclusion(exclusionId) {
        while (this.currentTagId !== undefined &&
            this.currentTagId !== exclusionId &&
            IMPLICIT_END_TAG_REQUIRED_THOROUGHLY.has(this.currentTagId)) {
            this.pop();
        }
    }
}

//Const
const NOAH_ARK_CAPACITY = 3;
var EntryType;
(function (EntryType) {
    EntryType[EntryType["Marker"] = 0] = "Marker";
    EntryType[EntryType["Element"] = 1] = "Element";
})(EntryType || (EntryType = {}));
const MARKER = { type: EntryType.Marker };
//List of formatting elements
class FormattingElementList {
    constructor(treeAdapter) {
        this.treeAdapter = treeAdapter;
        this.entries = [];
        this.bookmark = null;
    }
    //Noah Ark's condition
    //OPTIMIZATION: at first we try to find possible candidates for exclusion using
    //lightweight heuristics without thorough attributes check.
    _getNoahArkConditionCandidates(newElement, neAttrs) {
        const candidates = [];
        const neAttrsLength = neAttrs.length;
        const neTagName = this.treeAdapter.getTagName(newElement);
        const neNamespaceURI = this.treeAdapter.getNamespaceURI(newElement);
        for (let i = 0; i < this.entries.length; i++) {
            const entry = this.entries[i];
            if (entry.type === EntryType.Marker) {
                break;
            }
            const { element } = entry;
            if (this.treeAdapter.getTagName(element) === neTagName &&
                this.treeAdapter.getNamespaceURI(element) === neNamespaceURI) {
                const elementAttrs = this.treeAdapter.getAttrList(element);
                if (elementAttrs.length === neAttrsLength) {
                    candidates.push({ idx: i, attrs: elementAttrs });
                }
            }
        }
        return candidates;
    }
    _ensureNoahArkCondition(newElement) {
        if (this.entries.length < NOAH_ARK_CAPACITY)
            return;
        const neAttrs = this.treeAdapter.getAttrList(newElement);
        const candidates = this._getNoahArkConditionCandidates(newElement, neAttrs);
        if (candidates.length < NOAH_ARK_CAPACITY)
            return;
        //NOTE: build attrs map for the new element, so we can perform fast lookups
        const neAttrsMap = new Map(neAttrs.map((neAttr) => [neAttr.name, neAttr.value]));
        let validCandidates = 0;
        //NOTE: remove bottommost candidates, until Noah's Ark condition will not be met
        for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];
            // We know that `candidate.attrs.length === neAttrs.length`
            if (candidate.attrs.every((cAttr) => neAttrsMap.get(cAttr.name) === cAttr.value)) {
                validCandidates += 1;
                if (validCandidates >= NOAH_ARK_CAPACITY) {
                    this.entries.splice(candidate.idx, 1);
                }
            }
        }
    }
    //Mutations
    insertMarker() {
        this.entries.unshift(MARKER);
    }
    pushElement(element, token) {
        this._ensureNoahArkCondition(element);
        this.entries.unshift({
            type: EntryType.Element,
            element,
            token,
        });
    }
    insertElementAfterBookmark(element, token) {
        const bookmarkIdx = this.entries.indexOf(this.bookmark);
        this.entries.splice(bookmarkIdx, 0, {
            type: EntryType.Element,
            element,
            token,
        });
    }
    removeEntry(entry) {
        const entryIndex = this.entries.indexOf(entry);
        if (entryIndex !== -1) {
            this.entries.splice(entryIndex, 1);
        }
    }
    /**
     * Clears the list of formatting elements up to the last marker.
     *
     * @see https://html.spec.whatwg.org/multipage/parsing.html#clear-the-list-of-active-formatting-elements-up-to-the-last-marker
     */
    clearToLastMarker() {
        const markerIdx = this.entries.indexOf(MARKER);
        if (markerIdx === -1) {
            this.entries.length = 0;
        }
        else {
            this.entries.splice(0, markerIdx + 1);
        }
    }
    //Search
    getElementEntryInScopeWithTagName(tagName) {
        const entry = this.entries.find((entry) => entry.type === EntryType.Marker || this.treeAdapter.getTagName(entry.element) === tagName);
        return entry && entry.type === EntryType.Element ? entry : null;
    }
    getElementEntry(element) {
        return this.entries.find((entry) => entry.type === EntryType.Element && entry.element === element);
    }
}

const defaultTreeAdapter = {
    //Node construction
    createDocument() {
        return {
            nodeName: '#document',
            mode: DOCUMENT_MODE.NO_QUIRKS,
            childNodes: [],
        };
    },
    createDocumentFragment() {
        return {
            nodeName: '#document-fragment',
            childNodes: [],
        };
    },
    createElement(tagName, namespaceURI, attrs) {
        return {
            nodeName: tagName,
            tagName,
            attrs,
            namespaceURI,
            childNodes: [],
            parentNode: null,
        };
    },
    createCommentNode(data) {
        return {
            nodeName: '#comment',
            data,
            parentNode: null,
        };
    },
    createTextNode(value) {
        return {
            nodeName: '#text',
            value,
            parentNode: null,
        };
    },
    //Tree mutation
    appendChild(parentNode, newNode) {
        parentNode.childNodes.push(newNode);
        newNode.parentNode = parentNode;
    },
    insertBefore(parentNode, newNode, referenceNode) {
        const insertionIdx = parentNode.childNodes.indexOf(referenceNode);
        parentNode.childNodes.splice(insertionIdx, 0, newNode);
        newNode.parentNode = parentNode;
    },
    setTemplateContent(templateElement, contentElement) {
        templateElement.content = contentElement;
    },
    getTemplateContent(templateElement) {
        return templateElement.content;
    },
    setDocumentType(document, name, publicId, systemId) {
        const doctypeNode = document.childNodes.find((node) => node.nodeName === '#documentType');
        if (doctypeNode) {
            doctypeNode.name = name;
            doctypeNode.publicId = publicId;
            doctypeNode.systemId = systemId;
        }
        else {
            const node = {
                nodeName: '#documentType',
                name,
                publicId,
                systemId,
                parentNode: null,
            };
            defaultTreeAdapter.appendChild(document, node);
        }
    },
    setDocumentMode(document, mode) {
        document.mode = mode;
    },
    getDocumentMode(document) {
        return document.mode;
    },
    detachNode(node) {
        if (node.parentNode) {
            const idx = node.parentNode.childNodes.indexOf(node);
            node.parentNode.childNodes.splice(idx, 1);
            node.parentNode = null;
        }
    },
    insertText(parentNode, text) {
        if (parentNode.childNodes.length > 0) {
            const prevNode = parentNode.childNodes[parentNode.childNodes.length - 1];
            if (defaultTreeAdapter.isTextNode(prevNode)) {
                prevNode.value += text;
                return;
            }
        }
        defaultTreeAdapter.appendChild(parentNode, defaultTreeAdapter.createTextNode(text));
    },
    insertTextBefore(parentNode, text, referenceNode) {
        const prevNode = parentNode.childNodes[parentNode.childNodes.indexOf(referenceNode) - 1];
        if (prevNode && defaultTreeAdapter.isTextNode(prevNode)) {
            prevNode.value += text;
        }
        else {
            defaultTreeAdapter.insertBefore(parentNode, defaultTreeAdapter.createTextNode(text), referenceNode);
        }
    },
    adoptAttributes(recipient, attrs) {
        const recipientAttrsMap = new Set(recipient.attrs.map((attr) => attr.name));
        for (let j = 0; j < attrs.length; j++) {
            if (!recipientAttrsMap.has(attrs[j].name)) {
                recipient.attrs.push(attrs[j]);
            }
        }
    },
    //Tree traversing
    getFirstChild(node) {
        return node.childNodes[0];
    },
    getChildNodes(node) {
        return node.childNodes;
    },
    getParentNode(node) {
        return node.parentNode;
    },
    getAttrList(element) {
        return element.attrs;
    },
    //Node data
    getTagName(element) {
        return element.tagName;
    },
    getNamespaceURI(element) {
        return element.namespaceURI;
    },
    getTextNodeContent(textNode) {
        return textNode.value;
    },
    getCommentNodeContent(commentNode) {
        return commentNode.data;
    },
    getDocumentTypeNodeName(doctypeNode) {
        return doctypeNode.name;
    },
    getDocumentTypeNodePublicId(doctypeNode) {
        return doctypeNode.publicId;
    },
    getDocumentTypeNodeSystemId(doctypeNode) {
        return doctypeNode.systemId;
    },
    //Node types
    isTextNode(node) {
        return node.nodeName === '#text';
    },
    isCommentNode(node) {
        return node.nodeName === '#comment';
    },
    isDocumentTypeNode(node) {
        return node.nodeName === '#documentType';
    },
    isElementNode(node) {
        return Object.prototype.hasOwnProperty.call(node, 'tagName');
    },
    // Source code location
    setNodeSourceCodeLocation(node, location) {
        node.sourceCodeLocation = location;
    },
    getNodeSourceCodeLocation(node) {
        return node.sourceCodeLocation;
    },
    updateNodeSourceCodeLocation(node, endLocation) {
        node.sourceCodeLocation = { ...node.sourceCodeLocation, ...endLocation };
    },
};

//Const
const VALID_DOCTYPE_NAME = 'html';
const VALID_SYSTEM_ID = 'about:legacy-compat';
const QUIRKS_MODE_SYSTEM_ID = 'http://www.ibm.com/data/dtd/v11/ibmxhtml1-transitional.dtd';
const QUIRKS_MODE_PUBLIC_ID_PREFIXES = [
    '+//silmaril//dtd html pro v0r11 19970101//',
    '-//as//dtd html 3.0 aswedit + extensions//',
    '-//advasoft ltd//dtd html 3.0 aswedit + extensions//',
    '-//ietf//dtd html 2.0 level 1//',
    '-//ietf//dtd html 2.0 level 2//',
    '-//ietf//dtd html 2.0 strict level 1//',
    '-//ietf//dtd html 2.0 strict level 2//',
    '-//ietf//dtd html 2.0 strict//',
    '-//ietf//dtd html 2.0//',
    '-//ietf//dtd html 2.1e//',
    '-//ietf//dtd html 3.0//',
    '-//ietf//dtd html 3.2 final//',
    '-//ietf//dtd html 3.2//',
    '-//ietf//dtd html 3//',
    '-//ietf//dtd html level 0//',
    '-//ietf//dtd html level 1//',
    '-//ietf//dtd html level 2//',
    '-//ietf//dtd html level 3//',
    '-//ietf//dtd html strict level 0//',
    '-//ietf//dtd html strict level 1//',
    '-//ietf//dtd html strict level 2//',
    '-//ietf//dtd html strict level 3//',
    '-//ietf//dtd html strict//',
    '-//ietf//dtd html//',
    '-//metrius//dtd metrius presentational//',
    '-//microsoft//dtd internet explorer 2.0 html strict//',
    '-//microsoft//dtd internet explorer 2.0 html//',
    '-//microsoft//dtd internet explorer 2.0 tables//',
    '-//microsoft//dtd internet explorer 3.0 html strict//',
    '-//microsoft//dtd internet explorer 3.0 html//',
    '-//microsoft//dtd internet explorer 3.0 tables//',
    '-//netscape comm. corp.//dtd html//',
    '-//netscape comm. corp.//dtd strict html//',
    "-//o'reilly and associates//dtd html 2.0//",
    "-//o'reilly and associates//dtd html extended 1.0//",
    "-//o'reilly and associates//dtd html extended relaxed 1.0//",
    '-//sq//dtd html 2.0 hotmetal + extensions//',
    '-//softquad software//dtd hotmetal pro 6.0::19990601::extensions to html 4.0//',
    '-//softquad//dtd hotmetal pro 4.0::19971010::extensions to html 4.0//',
    '-//spyglass//dtd html 2.0 extended//',
    '-//sun microsystems corp.//dtd hotjava html//',
    '-//sun microsystems corp.//dtd hotjava strict html//',
    '-//w3c//dtd html 3 1995-03-24//',
    '-//w3c//dtd html 3.2 draft//',
    '-//w3c//dtd html 3.2 final//',
    '-//w3c//dtd html 3.2//',
    '-//w3c//dtd html 3.2s draft//',
    '-//w3c//dtd html 4.0 frameset//',
    '-//w3c//dtd html 4.0 transitional//',
    '-//w3c//dtd html experimental 19960712//',
    '-//w3c//dtd html experimental 970421//',
    '-//w3c//dtd w3 html//',
    '-//w3o//dtd w3 html 3.0//',
    '-//webtechs//dtd mozilla html 2.0//',
    '-//webtechs//dtd mozilla html//',
];
const QUIRKS_MODE_NO_SYSTEM_ID_PUBLIC_ID_PREFIXES = [
    ...QUIRKS_MODE_PUBLIC_ID_PREFIXES,
    '-//w3c//dtd html 4.01 frameset//',
    '-//w3c//dtd html 4.01 transitional//',
];
const QUIRKS_MODE_PUBLIC_IDS = new Set([
    '-//w3o//dtd w3 html strict 3.0//en//',
    '-/w3c/dtd html 4.0 transitional/en',
    'html',
]);
const LIMITED_QUIRKS_PUBLIC_ID_PREFIXES = ['-//w3c//dtd xhtml 1.0 frameset//', '-//w3c//dtd xhtml 1.0 transitional//'];
const LIMITED_QUIRKS_WITH_SYSTEM_ID_PUBLIC_ID_PREFIXES = [
    ...LIMITED_QUIRKS_PUBLIC_ID_PREFIXES,
    '-//w3c//dtd html 4.01 frameset//',
    '-//w3c//dtd html 4.01 transitional//',
];
//Utils
function hasPrefix(publicId, prefixes) {
    return prefixes.some((prefix) => publicId.startsWith(prefix));
}
//API
function isConforming(token) {
    return (token.name === VALID_DOCTYPE_NAME &&
        token.publicId === null &&
        (token.systemId === null || token.systemId === VALID_SYSTEM_ID));
}
function getDocumentMode(token) {
    if (token.name !== VALID_DOCTYPE_NAME) {
        return DOCUMENT_MODE.QUIRKS;
    }
    const { systemId } = token;
    if (systemId && systemId.toLowerCase() === QUIRKS_MODE_SYSTEM_ID) {
        return DOCUMENT_MODE.QUIRKS;
    }
    let { publicId } = token;
    if (publicId !== null) {
        publicId = publicId.toLowerCase();
        if (QUIRKS_MODE_PUBLIC_IDS.has(publicId)) {
            return DOCUMENT_MODE.QUIRKS;
        }
        let prefixes = systemId === null ? QUIRKS_MODE_NO_SYSTEM_ID_PUBLIC_ID_PREFIXES : QUIRKS_MODE_PUBLIC_ID_PREFIXES;
        if (hasPrefix(publicId, prefixes)) {
            return DOCUMENT_MODE.QUIRKS;
        }
        prefixes =
            systemId === null ? LIMITED_QUIRKS_PUBLIC_ID_PREFIXES : LIMITED_QUIRKS_WITH_SYSTEM_ID_PUBLIC_ID_PREFIXES;
        if (hasPrefix(publicId, prefixes)) {
            return DOCUMENT_MODE.LIMITED_QUIRKS;
        }
    }
    return DOCUMENT_MODE.NO_QUIRKS;
}

//MIME types
const MIME_TYPES = {
    TEXT_HTML: 'text/html',
    APPLICATION_XML: 'application/xhtml+xml',
};
//Attributes
const DEFINITION_URL_ATTR = 'definitionurl';
const ADJUSTED_DEFINITION_URL_ATTR = 'definitionURL';
const SVG_ATTRS_ADJUSTMENT_MAP = new Map([
    'attributeName',
    'attributeType',
    'baseFrequency',
    'baseProfile',
    'calcMode',
    'clipPathUnits',
    'diffuseConstant',
    'edgeMode',
    'filterUnits',
    'glyphRef',
    'gradientTransform',
    'gradientUnits',
    'kernelMatrix',
    'kernelUnitLength',
    'keyPoints',
    'keySplines',
    'keyTimes',
    'lengthAdjust',
    'limitingConeAngle',
    'markerHeight',
    'markerUnits',
    'markerWidth',
    'maskContentUnits',
    'maskUnits',
    'numOctaves',
    'pathLength',
    'patternContentUnits',
    'patternTransform',
    'patternUnits',
    'pointsAtX',
    'pointsAtY',
    'pointsAtZ',
    'preserveAlpha',
    'preserveAspectRatio',
    'primitiveUnits',
    'refX',
    'refY',
    'repeatCount',
    'repeatDur',
    'requiredExtensions',
    'requiredFeatures',
    'specularConstant',
    'specularExponent',
    'spreadMethod',
    'startOffset',
    'stdDeviation',
    'stitchTiles',
    'surfaceScale',
    'systemLanguage',
    'tableValues',
    'targetX',
    'targetY',
    'textLength',
    'viewBox',
    'viewTarget',
    'xChannelSelector',
    'yChannelSelector',
    'zoomAndPan',
].map((attr) => [attr.toLowerCase(), attr]));
const XML_ATTRS_ADJUSTMENT_MAP = new Map([
    ['xlink:actuate', { prefix: 'xlink', name: 'actuate', namespace: NS.XLINK }],
    ['xlink:arcrole', { prefix: 'xlink', name: 'arcrole', namespace: NS.XLINK }],
    ['xlink:href', { prefix: 'xlink', name: 'href', namespace: NS.XLINK }],
    ['xlink:role', { prefix: 'xlink', name: 'role', namespace: NS.XLINK }],
    ['xlink:show', { prefix: 'xlink', name: 'show', namespace: NS.XLINK }],
    ['xlink:title', { prefix: 'xlink', name: 'title', namespace: NS.XLINK }],
    ['xlink:type', { prefix: 'xlink', name: 'type', namespace: NS.XLINK }],
    ['xml:lang', { prefix: 'xml', name: 'lang', namespace: NS.XML }],
    ['xml:space', { prefix: 'xml', name: 'space', namespace: NS.XML }],
    ['xmlns', { prefix: '', name: 'xmlns', namespace: NS.XMLNS }],
    ['xmlns:xlink', { prefix: 'xmlns', name: 'xlink', namespace: NS.XMLNS }],
]);
//SVG tag names adjustment map
const SVG_TAG_NAMES_ADJUSTMENT_MAP = new Map([
    'altGlyph',
    'altGlyphDef',
    'altGlyphItem',
    'animateColor',
    'animateMotion',
    'animateTransform',
    'clipPath',
    'feBlend',
    'feColorMatrix',
    'feComponentTransfer',
    'feComposite',
    'feConvolveMatrix',
    'feDiffuseLighting',
    'feDisplacementMap',
    'feDistantLight',
    'feFlood',
    'feFuncA',
    'feFuncB',
    'feFuncG',
    'feFuncR',
    'feGaussianBlur',
    'feImage',
    'feMerge',
    'feMergeNode',
    'feMorphology',
    'feOffset',
    'fePointLight',
    'feSpecularLighting',
    'feSpotLight',
    'feTile',
    'feTurbulence',
    'foreignObject',
    'glyphRef',
    'linearGradient',
    'radialGradient',
    'textPath',
].map((tn) => [tn.toLowerCase(), tn]));
//Tags that causes exit from foreign content
const EXITS_FOREIGN_CONTENT = new Set([
    TAG_ID.B,
    TAG_ID.BIG,
    TAG_ID.BLOCKQUOTE,
    TAG_ID.BODY,
    TAG_ID.BR,
    TAG_ID.CENTER,
    TAG_ID.CODE,
    TAG_ID.DD,
    TAG_ID.DIV,
    TAG_ID.DL,
    TAG_ID.DT,
    TAG_ID.EM,
    TAG_ID.EMBED,
    TAG_ID.H1,
    TAG_ID.H2,
    TAG_ID.H3,
    TAG_ID.H4,
    TAG_ID.H5,
    TAG_ID.H6,
    TAG_ID.HEAD,
    TAG_ID.HR,
    TAG_ID.I,
    TAG_ID.IMG,
    TAG_ID.LI,
    TAG_ID.LISTING,
    TAG_ID.MENU,
    TAG_ID.META,
    TAG_ID.NOBR,
    TAG_ID.OL,
    TAG_ID.P,
    TAG_ID.PRE,
    TAG_ID.RUBY,
    TAG_ID.S,
    TAG_ID.SMALL,
    TAG_ID.SPAN,
    TAG_ID.STRONG,
    TAG_ID.STRIKE,
    TAG_ID.SUB,
    TAG_ID.SUP,
    TAG_ID.TABLE,
    TAG_ID.TT,
    TAG_ID.U,
    TAG_ID.UL,
    TAG_ID.VAR,
]);
//Check exit from foreign content
function causesExit(startTagToken) {
    const tn = startTagToken.tagID;
    const isFontWithAttrs = tn === TAG_ID.FONT &&
        startTagToken.attrs.some(({ name }) => name === ATTRS.COLOR || name === ATTRS.SIZE || name === ATTRS.FACE);
    return isFontWithAttrs || EXITS_FOREIGN_CONTENT.has(tn);
}
//Token adjustments
function adjustTokenMathMLAttrs(token) {
    for (let i = 0; i < token.attrs.length; i++) {
        if (token.attrs[i].name === DEFINITION_URL_ATTR) {
            token.attrs[i].name = ADJUSTED_DEFINITION_URL_ATTR;
            break;
        }
    }
}
function adjustTokenSVGAttrs(token) {
    for (let i = 0; i < token.attrs.length; i++) {
        const adjustedAttrName = SVG_ATTRS_ADJUSTMENT_MAP.get(token.attrs[i].name);
        if (adjustedAttrName != null) {
            token.attrs[i].name = adjustedAttrName;
        }
    }
}
function adjustTokenXMLAttrs(token) {
    for (let i = 0; i < token.attrs.length; i++) {
        const adjustedAttrEntry = XML_ATTRS_ADJUSTMENT_MAP.get(token.attrs[i].name);
        if (adjustedAttrEntry) {
            token.attrs[i].prefix = adjustedAttrEntry.prefix;
            token.attrs[i].name = adjustedAttrEntry.name;
            token.attrs[i].namespace = adjustedAttrEntry.namespace;
        }
    }
}
function adjustTokenSVGTagName(token) {
    const adjustedTagName = SVG_TAG_NAMES_ADJUSTMENT_MAP.get(token.tagName);
    if (adjustedTagName != null) {
        token.tagName = adjustedTagName;
        token.tagID = getTagID(token.tagName);
    }
}
//Integration points
function isMathMLTextIntegrationPoint(tn, ns) {
    return ns === NS.MATHML && (tn === TAG_ID.MI || tn === TAG_ID.MO || tn === TAG_ID.MN || tn === TAG_ID.MS || tn === TAG_ID.MTEXT);
}
function isHtmlIntegrationPoint(tn, ns, attrs) {
    if (ns === NS.MATHML && tn === TAG_ID.ANNOTATION_XML) {
        for (let i = 0; i < attrs.length; i++) {
            if (attrs[i].name === ATTRS.ENCODING) {
                const value = attrs[i].value.toLowerCase();
                return value === MIME_TYPES.TEXT_HTML || value === MIME_TYPES.APPLICATION_XML;
            }
        }
    }
    return ns === NS.SVG && (tn === TAG_ID.FOREIGN_OBJECT || tn === TAG_ID.DESC || tn === TAG_ID.TITLE);
}
function isIntegrationPoint(tn, ns, attrs, foreignNS) {
    return (((!foreignNS || foreignNS === NS.HTML) && isHtmlIntegrationPoint(tn, ns, attrs)) ||
        ((!foreignNS || foreignNS === NS.MATHML) && isMathMLTextIntegrationPoint(tn, ns)));
}

//Misc constants
const HIDDEN_INPUT_TYPE = 'hidden';
//Adoption agency loops iteration count
const AA_OUTER_LOOP_ITER = 8;
const AA_INNER_LOOP_ITER = 3;
//Insertion modes
var InsertionMode;
(function (InsertionMode) {
    InsertionMode[InsertionMode["INITIAL"] = 0] = "INITIAL";
    InsertionMode[InsertionMode["BEFORE_HTML"] = 1] = "BEFORE_HTML";
    InsertionMode[InsertionMode["BEFORE_HEAD"] = 2] = "BEFORE_HEAD";
    InsertionMode[InsertionMode["IN_HEAD"] = 3] = "IN_HEAD";
    InsertionMode[InsertionMode["IN_HEAD_NO_SCRIPT"] = 4] = "IN_HEAD_NO_SCRIPT";
    InsertionMode[InsertionMode["AFTER_HEAD"] = 5] = "AFTER_HEAD";
    InsertionMode[InsertionMode["IN_BODY"] = 6] = "IN_BODY";
    InsertionMode[InsertionMode["TEXT"] = 7] = "TEXT";
    InsertionMode[InsertionMode["IN_TABLE"] = 8] = "IN_TABLE";
    InsertionMode[InsertionMode["IN_TABLE_TEXT"] = 9] = "IN_TABLE_TEXT";
    InsertionMode[InsertionMode["IN_CAPTION"] = 10] = "IN_CAPTION";
    InsertionMode[InsertionMode["IN_COLUMN_GROUP"] = 11] = "IN_COLUMN_GROUP";
    InsertionMode[InsertionMode["IN_TABLE_BODY"] = 12] = "IN_TABLE_BODY";
    InsertionMode[InsertionMode["IN_ROW"] = 13] = "IN_ROW";
    InsertionMode[InsertionMode["IN_CELL"] = 14] = "IN_CELL";
    InsertionMode[InsertionMode["IN_SELECT"] = 15] = "IN_SELECT";
    InsertionMode[InsertionMode["IN_SELECT_IN_TABLE"] = 16] = "IN_SELECT_IN_TABLE";
    InsertionMode[InsertionMode["IN_TEMPLATE"] = 17] = "IN_TEMPLATE";
    InsertionMode[InsertionMode["AFTER_BODY"] = 18] = "AFTER_BODY";
    InsertionMode[InsertionMode["IN_FRAMESET"] = 19] = "IN_FRAMESET";
    InsertionMode[InsertionMode["AFTER_FRAMESET"] = 20] = "AFTER_FRAMESET";
    InsertionMode[InsertionMode["AFTER_AFTER_BODY"] = 21] = "AFTER_AFTER_BODY";
    InsertionMode[InsertionMode["AFTER_AFTER_FRAMESET"] = 22] = "AFTER_AFTER_FRAMESET";
})(InsertionMode || (InsertionMode = {}));
const BASE_LOC = {
    startLine: -1,
    startCol: -1,
    startOffset: -1,
    endLine: -1,
    endCol: -1,
    endOffset: -1,
};
const TABLE_STRUCTURE_TAGS = new Set([TAG_ID.TABLE, TAG_ID.TBODY, TAG_ID.TFOOT, TAG_ID.THEAD, TAG_ID.TR]);
const defaultParserOptions = {
    scriptingEnabled: true,
    sourceCodeLocationInfo: false,
    treeAdapter: defaultTreeAdapter,
    onParseError: null,
};
//Parser
class Parser {
    constructor(options, document, 
    /** @internal */
    fragmentContext = null, 
    /** @internal */
    scriptHandler = null) {
        this.fragmentContext = fragmentContext;
        this.scriptHandler = scriptHandler;
        this.currentToken = null;
        this.stopped = false;
        /** @internal */
        this.insertionMode = InsertionMode.INITIAL;
        /** @internal */
        this.originalInsertionMode = InsertionMode.INITIAL;
        /** @internal */
        this.headElement = null;
        /** @internal */
        this.formElement = null;
        /** Indicates that the current node is not an element in the HTML namespace */
        this.currentNotInHTML = false;
        /**
         * The template insertion mode stack is maintained from the left.
         * Ie. the topmost element will always have index 0.
         *
         * @internal
         */
        this.tmplInsertionModeStack = [];
        /** @internal */
        this.pendingCharacterTokens = [];
        /** @internal */
        this.hasNonWhitespacePendingCharacterToken = false;
        /** @internal */
        this.framesetOk = true;
        /** @internal */
        this.skipNextNewLine = false;
        /** @internal */
        this.fosterParentingEnabled = false;
        this.options = {
            ...defaultParserOptions,
            ...options,
        };
        this.treeAdapter = this.options.treeAdapter;
        this.onParseError = this.options.onParseError;
        // Always enable location info if we report parse errors.
        if (this.onParseError) {
            this.options.sourceCodeLocationInfo = true;
        }
        this.document = document !== null && document !== void 0 ? document : this.treeAdapter.createDocument();
        this.tokenizer = new Tokenizer(this.options, this);
        this.activeFormattingElements = new FormattingElementList(this.treeAdapter);
        this.fragmentContextID = fragmentContext ? getTagID(this.treeAdapter.getTagName(fragmentContext)) : TAG_ID.UNKNOWN;
        this._setContextModes(fragmentContext !== null && fragmentContext !== void 0 ? fragmentContext : this.document, this.fragmentContextID);
        this.openElements = new OpenElementStack(this.document, this.treeAdapter, this);
    }
    // API
    static parse(html, options) {
        const parser = new this(options);
        parser.tokenizer.write(html, true);
        return parser.document;
    }
    static getFragmentParser(fragmentContext, options) {
        const opts = {
            ...defaultParserOptions,
            ...options,
        };
        //NOTE: use a <template> element as the fragment context if no context element was provided,
        //so we will parse in a "forgiving" manner
        fragmentContext !== null && fragmentContext !== void 0 ? fragmentContext : (fragmentContext = opts.treeAdapter.createElement(TAG_NAMES.TEMPLATE, NS.HTML, []));
        //NOTE: create a fake element which will be used as the `document` for fragment parsing.
        //This is important for jsdom, where a new `document` cannot be created. This led to
        //fragment parsing messing with the main `document`.
        const documentMock = opts.treeAdapter.createElement('documentmock', NS.HTML, []);
        const parser = new this(opts, documentMock, fragmentContext);
        if (parser.fragmentContextID === TAG_ID.TEMPLATE) {
            parser.tmplInsertionModeStack.unshift(InsertionMode.IN_TEMPLATE);
        }
        parser._initTokenizerForFragmentParsing();
        parser._insertFakeRootElement();
        parser._resetInsertionMode();
        parser._findFormInFragmentContext();
        return parser;
    }
    getFragment() {
        const rootElement = this.treeAdapter.getFirstChild(this.document);
        const fragment = this.treeAdapter.createDocumentFragment();
        this._adoptNodes(rootElement, fragment);
        return fragment;
    }
    //Errors
    /** @internal */
    _err(token, code, beforeToken) {
        var _a;
        if (!this.onParseError)
            return;
        const loc = (_a = token.location) !== null && _a !== void 0 ? _a : BASE_LOC;
        const err = {
            code,
            startLine: loc.startLine,
            startCol: loc.startCol,
            startOffset: loc.startOffset,
            endLine: beforeToken ? loc.startLine : loc.endLine,
            endCol: beforeToken ? loc.startCol : loc.endCol,
            endOffset: beforeToken ? loc.startOffset : loc.endOffset,
        };
        this.onParseError(err);
    }
    //Stack events
    /** @internal */
    onItemPush(node, tid, isTop) {
        var _a, _b;
        (_b = (_a = this.treeAdapter).onItemPush) === null || _b === void 0 ? void 0 : _b.call(_a, node);
        if (isTop && this.openElements.stackTop > 0)
            this._setContextModes(node, tid);
    }
    /** @internal */
    onItemPop(node, isTop) {
        var _a, _b;
        if (this.options.sourceCodeLocationInfo) {
            this._setEndLocation(node, this.currentToken);
        }
        (_b = (_a = this.treeAdapter).onItemPop) === null || _b === void 0 ? void 0 : _b.call(_a, node, this.openElements.current);
        if (isTop) {
            let current;
            let currentTagId;
            if (this.openElements.stackTop === 0 && this.fragmentContext) {
                current = this.fragmentContext;
                currentTagId = this.fragmentContextID;
            }
            else {
                ({ current, currentTagId } = this.openElements);
            }
            this._setContextModes(current, currentTagId);
        }
    }
    _setContextModes(current, tid) {
        const isHTML = current === this.document || (current && this.treeAdapter.getNamespaceURI(current) === NS.HTML);
        this.currentNotInHTML = !isHTML;
        this.tokenizer.inForeignNode =
            !isHTML && current !== undefined && tid !== undefined && !this._isIntegrationPoint(tid, current);
    }
    /** @protected */
    _switchToTextParsing(currentToken, nextTokenizerState) {
        this._insertElement(currentToken, NS.HTML);
        this.tokenizer.state = nextTokenizerState;
        this.originalInsertionMode = this.insertionMode;
        this.insertionMode = InsertionMode.TEXT;
    }
    switchToPlaintextParsing() {
        this.insertionMode = InsertionMode.TEXT;
        this.originalInsertionMode = InsertionMode.IN_BODY;
        this.tokenizer.state = TokenizerMode.PLAINTEXT;
    }
    //Fragment parsing
    /** @protected */
    _getAdjustedCurrentElement() {
        return this.openElements.stackTop === 0 && this.fragmentContext
            ? this.fragmentContext
            : this.openElements.current;
    }
    /** @protected */
    _findFormInFragmentContext() {
        let node = this.fragmentContext;
        while (node) {
            if (this.treeAdapter.getTagName(node) === TAG_NAMES.FORM) {
                this.formElement = node;
                break;
            }
            node = this.treeAdapter.getParentNode(node);
        }
    }
    _initTokenizerForFragmentParsing() {
        if (!this.fragmentContext || this.treeAdapter.getNamespaceURI(this.fragmentContext) !== NS.HTML) {
            return;
        }
        switch (this.fragmentContextID) {
            case TAG_ID.TITLE:
            case TAG_ID.TEXTAREA: {
                this.tokenizer.state = TokenizerMode.RCDATA;
                break;
            }
            case TAG_ID.STYLE:
            case TAG_ID.XMP:
            case TAG_ID.IFRAME:
            case TAG_ID.NOEMBED:
            case TAG_ID.NOFRAMES:
            case TAG_ID.NOSCRIPT: {
                this.tokenizer.state = TokenizerMode.RAWTEXT;
                break;
            }
            case TAG_ID.SCRIPT: {
                this.tokenizer.state = TokenizerMode.SCRIPT_DATA;
                break;
            }
            case TAG_ID.PLAINTEXT: {
                this.tokenizer.state = TokenizerMode.PLAINTEXT;
                break;
            }
            // Do nothing
        }
    }
    //Tree mutation
    /** @protected */
    _setDocumentType(token) {
        const name = token.name || '';
        const publicId = token.publicId || '';
        const systemId = token.systemId || '';
        this.treeAdapter.setDocumentType(this.document, name, publicId, systemId);
        if (token.location) {
            const documentChildren = this.treeAdapter.getChildNodes(this.document);
            const docTypeNode = documentChildren.find((node) => this.treeAdapter.isDocumentTypeNode(node));
            if (docTypeNode) {
                this.treeAdapter.setNodeSourceCodeLocation(docTypeNode, token.location);
            }
        }
    }
    /** @protected */
    _attachElementToTree(element, location) {
        if (this.options.sourceCodeLocationInfo) {
            const loc = location && {
                ...location,
                startTag: location,
            };
            this.treeAdapter.setNodeSourceCodeLocation(element, loc);
        }
        if (this._shouldFosterParentOnInsertion()) {
            this._fosterParentElement(element);
        }
        else {
            const parent = this.openElements.currentTmplContentOrNode;
            this.treeAdapter.appendChild(parent !== null && parent !== void 0 ? parent : this.document, element);
        }
    }
    /**
     * For self-closing tags. Add an element to the tree, but skip adding it
     * to the stack.
     */
    /** @protected */
    _appendElement(token, namespaceURI) {
        const element = this.treeAdapter.createElement(token.tagName, namespaceURI, token.attrs);
        this._attachElementToTree(element, token.location);
    }
    /** @protected */
    _insertElement(token, namespaceURI) {
        const element = this.treeAdapter.createElement(token.tagName, namespaceURI, token.attrs);
        this._attachElementToTree(element, token.location);
        this.openElements.push(element, token.tagID);
    }
    /** @protected */
    _insertFakeElement(tagName, tagID) {
        const element = this.treeAdapter.createElement(tagName, NS.HTML, []);
        this._attachElementToTree(element, null);
        this.openElements.push(element, tagID);
    }
    /** @protected */
    _insertTemplate(token) {
        const tmpl = this.treeAdapter.createElement(token.tagName, NS.HTML, token.attrs);
        const content = this.treeAdapter.createDocumentFragment();
        this.treeAdapter.setTemplateContent(tmpl, content);
        this._attachElementToTree(tmpl, token.location);
        this.openElements.push(tmpl, token.tagID);
        if (this.options.sourceCodeLocationInfo)
            this.treeAdapter.setNodeSourceCodeLocation(content, null);
    }
    /** @protected */
    _insertFakeRootElement() {
        const element = this.treeAdapter.createElement(TAG_NAMES.HTML, NS.HTML, []);
        if (this.options.sourceCodeLocationInfo)
            this.treeAdapter.setNodeSourceCodeLocation(element, null);
        this.treeAdapter.appendChild(this.openElements.current, element);
        this.openElements.push(element, TAG_ID.HTML);
    }
    /** @protected */
    _appendCommentNode(token, parent) {
        const commentNode = this.treeAdapter.createCommentNode(token.data);
        this.treeAdapter.appendChild(parent, commentNode);
        if (this.options.sourceCodeLocationInfo) {
            this.treeAdapter.setNodeSourceCodeLocation(commentNode, token.location);
        }
    }
    /** @protected */
    _insertCharacters(token) {
        let parent;
        let beforeElement;
        if (this._shouldFosterParentOnInsertion()) {
            ({ parent, beforeElement } = this._findFosterParentingLocation());
            if (beforeElement) {
                this.treeAdapter.insertTextBefore(parent, token.chars, beforeElement);
            }
            else {
                this.treeAdapter.insertText(parent, token.chars);
            }
        }
        else {
            parent = this.openElements.currentTmplContentOrNode;
            this.treeAdapter.insertText(parent, token.chars);
        }
        if (!token.location)
            return;
        const siblings = this.treeAdapter.getChildNodes(parent);
        const textNodeIdx = beforeElement ? siblings.lastIndexOf(beforeElement) : siblings.length;
        const textNode = siblings[textNodeIdx - 1];
        //NOTE: if we have a location assigned by another token, then just update the end position
        const tnLoc = this.treeAdapter.getNodeSourceCodeLocation(textNode);
        if (tnLoc) {
            const { endLine, endCol, endOffset } = token.location;
            this.treeAdapter.updateNodeSourceCodeLocation(textNode, { endLine, endCol, endOffset });
        }
        else if (this.options.sourceCodeLocationInfo) {
            this.treeAdapter.setNodeSourceCodeLocation(textNode, token.location);
        }
    }
    /** @protected */
    _adoptNodes(donor, recipient) {
        for (let child = this.treeAdapter.getFirstChild(donor); child; child = this.treeAdapter.getFirstChild(donor)) {
            this.treeAdapter.detachNode(child);
            this.treeAdapter.appendChild(recipient, child);
        }
    }
    /** @protected */
    _setEndLocation(element, closingToken) {
        if (this.treeAdapter.getNodeSourceCodeLocation(element) && closingToken.location) {
            const ctLoc = closingToken.location;
            const tn = this.treeAdapter.getTagName(element);
            const endLoc = 
            // NOTE: For cases like <p> <p> </p> - First 'p' closes without a closing
            // tag and for cases like <td> <p> </td> - 'p' closes without a closing tag.
            closingToken.type === TokenType.END_TAG && tn === closingToken.tagName
                ? {
                    endTag: { ...ctLoc },
                    endLine: ctLoc.endLine,
                    endCol: ctLoc.endCol,
                    endOffset: ctLoc.endOffset,
                }
                : {
                    endLine: ctLoc.startLine,
                    endCol: ctLoc.startCol,
                    endOffset: ctLoc.startOffset,
                };
            this.treeAdapter.updateNodeSourceCodeLocation(element, endLoc);
        }
    }
    //Token processing
    shouldProcessStartTagTokenInForeignContent(token) {
        // Check that neither current === document, or ns === NS.HTML
        if (!this.currentNotInHTML)
            return false;
        let current;
        let currentTagId;
        if (this.openElements.stackTop === 0 && this.fragmentContext) {
            current = this.fragmentContext;
            currentTagId = this.fragmentContextID;
        }
        else {
            ({ current, currentTagId } = this.openElements);
        }
        if (token.tagID === TAG_ID.SVG &&
            this.treeAdapter.getTagName(current) === TAG_NAMES.ANNOTATION_XML &&
            this.treeAdapter.getNamespaceURI(current) === NS.MATHML) {
            return false;
        }
        return (
        // Check that `current` is not an integration point for HTML or MathML elements.
        this.tokenizer.inForeignNode ||
            // If it _is_ an integration point, then we might have to check that it is not an HTML
            // integration point.
            ((token.tagID === TAG_ID.MGLYPH || token.tagID === TAG_ID.MALIGNMARK) &&
                currentTagId !== undefined &&
                !this._isIntegrationPoint(currentTagId, current, NS.HTML)));
    }
    /** @protected */
    _processToken(token) {
        switch (token.type) {
            case TokenType.CHARACTER: {
                this.onCharacter(token);
                break;
            }
            case TokenType.NULL_CHARACTER: {
                this.onNullCharacter(token);
                break;
            }
            case TokenType.COMMENT: {
                this.onComment(token);
                break;
            }
            case TokenType.DOCTYPE: {
                this.onDoctype(token);
                break;
            }
            case TokenType.START_TAG: {
                this._processStartTag(token);
                break;
            }
            case TokenType.END_TAG: {
                this.onEndTag(token);
                break;
            }
            case TokenType.EOF: {
                this.onEof(token);
                break;
            }
            case TokenType.WHITESPACE_CHARACTER: {
                this.onWhitespaceCharacter(token);
                break;
            }
        }
    }
    //Integration points
    /** @protected */
    _isIntegrationPoint(tid, element, foreignNS) {
        const ns = this.treeAdapter.getNamespaceURI(element);
        const attrs = this.treeAdapter.getAttrList(element);
        return isIntegrationPoint(tid, ns, attrs, foreignNS);
    }
    //Active formatting elements reconstruction
    /** @protected */
    _reconstructActiveFormattingElements() {
        const listLength = this.activeFormattingElements.entries.length;
        if (listLength) {
            const endIndex = this.activeFormattingElements.entries.findIndex((entry) => entry.type === EntryType.Marker || this.openElements.contains(entry.element));
            const unopenIdx = endIndex === -1 ? listLength - 1 : endIndex - 1;
            for (let i = unopenIdx; i >= 0; i--) {
                const entry = this.activeFormattingElements.entries[i];
                this._insertElement(entry.token, this.treeAdapter.getNamespaceURI(entry.element));
                entry.element = this.openElements.current;
            }
        }
    }
    //Close elements
    /** @protected */
    _closeTableCell() {
        this.openElements.generateImpliedEndTags();
        this.openElements.popUntilTableCellPopped();
        this.activeFormattingElements.clearToLastMarker();
        this.insertionMode = InsertionMode.IN_ROW;
    }
    /** @protected */
    _closePElement() {
        this.openElements.generateImpliedEndTagsWithExclusion(TAG_ID.P);
        this.openElements.popUntilTagNamePopped(TAG_ID.P);
    }
    //Insertion modes
    /** @protected */
    _resetInsertionMode() {
        for (let i = this.openElements.stackTop; i >= 0; i--) {
            //Insertion mode reset map
            switch (i === 0 && this.fragmentContext ? this.fragmentContextID : this.openElements.tagIDs[i]) {
                case TAG_ID.TR: {
                    this.insertionMode = InsertionMode.IN_ROW;
                    return;
                }
                case TAG_ID.TBODY:
                case TAG_ID.THEAD:
                case TAG_ID.TFOOT: {
                    this.insertionMode = InsertionMode.IN_TABLE_BODY;
                    return;
                }
                case TAG_ID.CAPTION: {
                    this.insertionMode = InsertionMode.IN_CAPTION;
                    return;
                }
                case TAG_ID.COLGROUP: {
                    this.insertionMode = InsertionMode.IN_COLUMN_GROUP;
                    return;
                }
                case TAG_ID.TABLE: {
                    this.insertionMode = InsertionMode.IN_TABLE;
                    return;
                }
                case TAG_ID.BODY: {
                    this.insertionMode = InsertionMode.IN_BODY;
                    return;
                }
                case TAG_ID.FRAMESET: {
                    this.insertionMode = InsertionMode.IN_FRAMESET;
                    return;
                }
                case TAG_ID.SELECT: {
                    this._resetInsertionModeForSelect(i);
                    return;
                }
                case TAG_ID.TEMPLATE: {
                    this.insertionMode = this.tmplInsertionModeStack[0];
                    return;
                }
                case TAG_ID.HTML: {
                    this.insertionMode = this.headElement ? InsertionMode.AFTER_HEAD : InsertionMode.BEFORE_HEAD;
                    return;
                }
                case TAG_ID.TD:
                case TAG_ID.TH: {
                    if (i > 0) {
                        this.insertionMode = InsertionMode.IN_CELL;
                        return;
                    }
                    break;
                }
                case TAG_ID.HEAD: {
                    if (i > 0) {
                        this.insertionMode = InsertionMode.IN_HEAD;
                        return;
                    }
                    break;
                }
            }
        }
        this.insertionMode = InsertionMode.IN_BODY;
    }
    /** @protected */
    _resetInsertionModeForSelect(selectIdx) {
        if (selectIdx > 0) {
            for (let i = selectIdx - 1; i > 0; i--) {
                const tn = this.openElements.tagIDs[i];
                if (tn === TAG_ID.TEMPLATE) {
                    break;
                }
                else if (tn === TAG_ID.TABLE) {
                    this.insertionMode = InsertionMode.IN_SELECT_IN_TABLE;
                    return;
                }
            }
        }
        this.insertionMode = InsertionMode.IN_SELECT;
    }
    //Foster parenting
    /** @protected */
    _isElementCausesFosterParenting(tn) {
        return TABLE_STRUCTURE_TAGS.has(tn);
    }
    /** @protected */
    _shouldFosterParentOnInsertion() {
        return (this.fosterParentingEnabled &&
            this.openElements.currentTagId !== undefined &&
            this._isElementCausesFosterParenting(this.openElements.currentTagId));
    }
    /** @protected */
    _findFosterParentingLocation() {
        for (let i = this.openElements.stackTop; i >= 0; i--) {
            const openElement = this.openElements.items[i];
            switch (this.openElements.tagIDs[i]) {
                case TAG_ID.TEMPLATE: {
                    if (this.treeAdapter.getNamespaceURI(openElement) === NS.HTML) {
                        return { parent: this.treeAdapter.getTemplateContent(openElement), beforeElement: null };
                    }
                    break;
                }
                case TAG_ID.TABLE: {
                    const parent = this.treeAdapter.getParentNode(openElement);
                    if (parent) {
                        return { parent, beforeElement: openElement };
                    }
                    return { parent: this.openElements.items[i - 1], beforeElement: null };
                }
                // Do nothing
            }
        }
        return { parent: this.openElements.items[0], beforeElement: null };
    }
    /** @protected */
    _fosterParentElement(element) {
        const location = this._findFosterParentingLocation();
        if (location.beforeElement) {
            this.treeAdapter.insertBefore(location.parent, element, location.beforeElement);
        }
        else {
            this.treeAdapter.appendChild(location.parent, element);
        }
    }
    //Special elements
    /** @protected */
    _isSpecialElement(element, id) {
        const ns = this.treeAdapter.getNamespaceURI(element);
        return SPECIAL_ELEMENTS[ns].has(id);
    }
    /** @internal */
    onCharacter(token) {
        this.skipNextNewLine = false;
        if (this.tokenizer.inForeignNode) {
            characterInForeignContent(this, token);
            return;
        }
        switch (this.insertionMode) {
            case InsertionMode.INITIAL: {
                tokenInInitialMode(this, token);
                break;
            }
            case InsertionMode.BEFORE_HTML: {
                tokenBeforeHtml(this, token);
                break;
            }
            case InsertionMode.BEFORE_HEAD: {
                tokenBeforeHead(this, token);
                break;
            }
            case InsertionMode.IN_HEAD: {
                tokenInHead(this, token);
                break;
            }
            case InsertionMode.IN_HEAD_NO_SCRIPT: {
                tokenInHeadNoScript(this, token);
                break;
            }
            case InsertionMode.AFTER_HEAD: {
                tokenAfterHead(this, token);
                break;
            }
            case InsertionMode.IN_BODY:
            case InsertionMode.IN_CAPTION:
            case InsertionMode.IN_CELL:
            case InsertionMode.IN_TEMPLATE: {
                characterInBody(this, token);
                break;
            }
            case InsertionMode.TEXT:
            case InsertionMode.IN_SELECT:
            case InsertionMode.IN_SELECT_IN_TABLE: {
                this._insertCharacters(token);
                break;
            }
            case InsertionMode.IN_TABLE:
            case InsertionMode.IN_TABLE_BODY:
            case InsertionMode.IN_ROW: {
                characterInTable(this, token);
                break;
            }
            case InsertionMode.IN_TABLE_TEXT: {
                characterInTableText(this, token);
                break;
            }
            case InsertionMode.IN_COLUMN_GROUP: {
                tokenInColumnGroup(this, token);
                break;
            }
            case InsertionMode.AFTER_BODY: {
                tokenAfterBody(this, token);
                break;
            }
            case InsertionMode.AFTER_AFTER_BODY: {
                tokenAfterAfterBody(this, token);
                break;
            }
            // Do nothing
        }
    }
    /** @internal */
    onNullCharacter(token) {
        this.skipNextNewLine = false;
        if (this.tokenizer.inForeignNode) {
            nullCharacterInForeignContent(this, token);
            return;
        }
        switch (this.insertionMode) {
            case InsertionMode.INITIAL: {
                tokenInInitialMode(this, token);
                break;
            }
            case InsertionMode.BEFORE_HTML: {
                tokenBeforeHtml(this, token);
                break;
            }
            case InsertionMode.BEFORE_HEAD: {
                tokenBeforeHead(this, token);
                break;
            }
            case InsertionMode.IN_HEAD: {
                tokenInHead(this, token);
                break;
            }
            case InsertionMode.IN_HEAD_NO_SCRIPT: {
                tokenInHeadNoScript(this, token);
                break;
            }
            case InsertionMode.AFTER_HEAD: {
                tokenAfterHead(this, token);
                break;
            }
            case InsertionMode.TEXT: {
                this._insertCharacters(token);
                break;
            }
            case InsertionMode.IN_TABLE:
            case InsertionMode.IN_TABLE_BODY:
            case InsertionMode.IN_ROW: {
                characterInTable(this, token);
                break;
            }
            case InsertionMode.IN_COLUMN_GROUP: {
                tokenInColumnGroup(this, token);
                break;
            }
            case InsertionMode.AFTER_BODY: {
                tokenAfterBody(this, token);
                break;
            }
            case InsertionMode.AFTER_AFTER_BODY: {
                tokenAfterAfterBody(this, token);
                break;
            }
            // Do nothing
        }
    }
    /** @internal */
    onComment(token) {
        this.skipNextNewLine = false;
        if (this.currentNotInHTML) {
            appendComment(this, token);
            return;
        }
        switch (this.insertionMode) {
            case InsertionMode.INITIAL:
            case InsertionMode.BEFORE_HTML:
            case InsertionMode.BEFORE_HEAD:
            case InsertionMode.IN_HEAD:
            case InsertionMode.IN_HEAD_NO_SCRIPT:
            case InsertionMode.AFTER_HEAD:
            case InsertionMode.IN_BODY:
            case InsertionMode.IN_TABLE:
            case InsertionMode.IN_CAPTION:
            case InsertionMode.IN_COLUMN_GROUP:
            case InsertionMode.IN_TABLE_BODY:
            case InsertionMode.IN_ROW:
            case InsertionMode.IN_CELL:
            case InsertionMode.IN_SELECT:
            case InsertionMode.IN_SELECT_IN_TABLE:
            case InsertionMode.IN_TEMPLATE:
            case InsertionMode.IN_FRAMESET:
            case InsertionMode.AFTER_FRAMESET: {
                appendComment(this, token);
                break;
            }
            case InsertionMode.IN_TABLE_TEXT: {
                tokenInTableText(this, token);
                break;
            }
            case InsertionMode.AFTER_BODY: {
                appendCommentToRootHtmlElement(this, token);
                break;
            }
            case InsertionMode.AFTER_AFTER_BODY:
            case InsertionMode.AFTER_AFTER_FRAMESET: {
                appendCommentToDocument(this, token);
                break;
            }
            // Do nothing
        }
    }
    /** @internal */
    onDoctype(token) {
        this.skipNextNewLine = false;
        switch (this.insertionMode) {
            case InsertionMode.INITIAL: {
                doctypeInInitialMode(this, token);
                break;
            }
            case InsertionMode.BEFORE_HEAD:
            case InsertionMode.IN_HEAD:
            case InsertionMode.IN_HEAD_NO_SCRIPT:
            case InsertionMode.AFTER_HEAD: {
                this._err(token, ERR.misplacedDoctype);
                break;
            }
            case InsertionMode.IN_TABLE_TEXT: {
                tokenInTableText(this, token);
                break;
            }
            // Do nothing
        }
    }
    /** @internal */
    onStartTag(token) {
        this.skipNextNewLine = false;
        this.currentToken = token;
        this._processStartTag(token);
        if (token.selfClosing && !token.ackSelfClosing) {
            this._err(token, ERR.nonVoidHtmlElementStartTagWithTrailingSolidus);
        }
    }
    /**
     * Processes a given start tag.
     *
     * `onStartTag` checks if a self-closing tag was recognized. When a token
     * is moved inbetween multiple insertion modes, this check for self-closing
     * could lead to false positives. To avoid this, `_processStartTag` is used
     * for nested calls.
     *
     * @param token The token to process.
     * @protected
     */
    _processStartTag(token) {
        if (this.shouldProcessStartTagTokenInForeignContent(token)) {
            startTagInForeignContent(this, token);
        }
        else {
            this._startTagOutsideForeignContent(token);
        }
    }
    /** @protected */
    _startTagOutsideForeignContent(token) {
        switch (this.insertionMode) {
            case InsertionMode.INITIAL: {
                tokenInInitialMode(this, token);
                break;
            }
            case InsertionMode.BEFORE_HTML: {
                startTagBeforeHtml(this, token);
                break;
            }
            case InsertionMode.BEFORE_HEAD: {
                startTagBeforeHead(this, token);
                break;
            }
            case InsertionMode.IN_HEAD: {
                startTagInHead(this, token);
                break;
            }
            case InsertionMode.IN_HEAD_NO_SCRIPT: {
                startTagInHeadNoScript(this, token);
                break;
            }
            case InsertionMode.AFTER_HEAD: {
                startTagAfterHead(this, token);
                break;
            }
            case InsertionMode.IN_BODY: {
                startTagInBody(this, token);
                break;
            }
            case InsertionMode.IN_TABLE: {
                startTagInTable(this, token);
                break;
            }
            case InsertionMode.IN_TABLE_TEXT: {
                tokenInTableText(this, token);
                break;
            }
            case InsertionMode.IN_CAPTION: {
                startTagInCaption(this, token);
                break;
            }
            case InsertionMode.IN_COLUMN_GROUP: {
                startTagInColumnGroup(this, token);
                break;
            }
            case InsertionMode.IN_TABLE_BODY: {
                startTagInTableBody(this, token);
                break;
            }
            case InsertionMode.IN_ROW: {
                startTagInRow(this, token);
                break;
            }
            case InsertionMode.IN_CELL: {
                startTagInCell(this, token);
                break;
            }
            case InsertionMode.IN_SELECT: {
                startTagInSelect(this, token);
                break;
            }
            case InsertionMode.IN_SELECT_IN_TABLE: {
                startTagInSelectInTable(this, token);
                break;
            }
            case InsertionMode.IN_TEMPLATE: {
                startTagInTemplate(this, token);
                break;
            }
            case InsertionMode.AFTER_BODY: {
                startTagAfterBody(this, token);
                break;
            }
            case InsertionMode.IN_FRAMESET: {
                startTagInFrameset(this, token);
                break;
            }
            case InsertionMode.AFTER_FRAMESET: {
                startTagAfterFrameset(this, token);
                break;
            }
            case InsertionMode.AFTER_AFTER_BODY: {
                startTagAfterAfterBody(this, token);
                break;
            }
            case InsertionMode.AFTER_AFTER_FRAMESET: {
                startTagAfterAfterFrameset(this, token);
                break;
            }
            // Do nothing
        }
    }
    /** @internal */
    onEndTag(token) {
        this.skipNextNewLine = false;
        this.currentToken = token;
        if (this.currentNotInHTML) {
            endTagInForeignContent(this, token);
        }
        else {
            this._endTagOutsideForeignContent(token);
        }
    }
    /** @protected */
    _endTagOutsideForeignContent(token) {
        switch (this.insertionMode) {
            case InsertionMode.INITIAL: {
                tokenInInitialMode(this, token);
                break;
            }
            case InsertionMode.BEFORE_HTML: {
                endTagBeforeHtml(this, token);
                break;
            }
            case InsertionMode.BEFORE_HEAD: {
                endTagBeforeHead(this, token);
                break;
            }
            case InsertionMode.IN_HEAD: {
                endTagInHead(this, token);
                break;
            }
            case InsertionMode.IN_HEAD_NO_SCRIPT: {
                endTagInHeadNoScript(this, token);
                break;
            }
            case InsertionMode.AFTER_HEAD: {
                endTagAfterHead(this, token);
                break;
            }
            case InsertionMode.IN_BODY: {
                endTagInBody(this, token);
                break;
            }
            case InsertionMode.TEXT: {
                endTagInText(this, token);
                break;
            }
            case InsertionMode.IN_TABLE: {
                endTagInTable(this, token);
                break;
            }
            case InsertionMode.IN_TABLE_TEXT: {
                tokenInTableText(this, token);
                break;
            }
            case InsertionMode.IN_CAPTION: {
                endTagInCaption(this, token);
                break;
            }
            case InsertionMode.IN_COLUMN_GROUP: {
                endTagInColumnGroup(this, token);
                break;
            }
            case InsertionMode.IN_TABLE_BODY: {
                endTagInTableBody(this, token);
                break;
            }
            case InsertionMode.IN_ROW: {
                endTagInRow(this, token);
                break;
            }
            case InsertionMode.IN_CELL: {
                endTagInCell(this, token);
                break;
            }
            case InsertionMode.IN_SELECT: {
                endTagInSelect(this, token);
                break;
            }
            case InsertionMode.IN_SELECT_IN_TABLE: {
                endTagInSelectInTable(this, token);
                break;
            }
            case InsertionMode.IN_TEMPLATE: {
                endTagInTemplate(this, token);
                break;
            }
            case InsertionMode.AFTER_BODY: {
                endTagAfterBody(this, token);
                break;
            }
            case InsertionMode.IN_FRAMESET: {
                endTagInFrameset(this, token);
                break;
            }
            case InsertionMode.AFTER_FRAMESET: {
                endTagAfterFrameset(this, token);
                break;
            }
            case InsertionMode.AFTER_AFTER_BODY: {
                tokenAfterAfterBody(this, token);
                break;
            }
            // Do nothing
        }
    }
    /** @internal */
    onEof(token) {
        switch (this.insertionMode) {
            case InsertionMode.INITIAL: {
                tokenInInitialMode(this, token);
                break;
            }
            case InsertionMode.BEFORE_HTML: {
                tokenBeforeHtml(this, token);
                break;
            }
            case InsertionMode.BEFORE_HEAD: {
                tokenBeforeHead(this, token);
                break;
            }
            case InsertionMode.IN_HEAD: {
                tokenInHead(this, token);
                break;
            }
            case InsertionMode.IN_HEAD_NO_SCRIPT: {
                tokenInHeadNoScript(this, token);
                break;
            }
            case InsertionMode.AFTER_HEAD: {
                tokenAfterHead(this, token);
                break;
            }
            case InsertionMode.IN_BODY:
            case InsertionMode.IN_TABLE:
            case InsertionMode.IN_CAPTION:
            case InsertionMode.IN_COLUMN_GROUP:
            case InsertionMode.IN_TABLE_BODY:
            case InsertionMode.IN_ROW:
            case InsertionMode.IN_CELL:
            case InsertionMode.IN_SELECT:
            case InsertionMode.IN_SELECT_IN_TABLE: {
                eofInBody(this, token);
                break;
            }
            case InsertionMode.TEXT: {
                eofInText(this, token);
                break;
            }
            case InsertionMode.IN_TABLE_TEXT: {
                tokenInTableText(this, token);
                break;
            }
            case InsertionMode.IN_TEMPLATE: {
                eofInTemplate(this, token);
                break;
            }
            case InsertionMode.AFTER_BODY:
            case InsertionMode.IN_FRAMESET:
            case InsertionMode.AFTER_FRAMESET:
            case InsertionMode.AFTER_AFTER_BODY:
            case InsertionMode.AFTER_AFTER_FRAMESET: {
                stopParsing(this, token);
                break;
            }
            // Do nothing
        }
    }
    /** @internal */
    onWhitespaceCharacter(token) {
        if (this.skipNextNewLine) {
            this.skipNextNewLine = false;
            if (token.chars.charCodeAt(0) === CODE_POINTS.LINE_FEED) {
                if (token.chars.length === 1) {
                    return;
                }
                token.chars = token.chars.substr(1);
            }
        }
        if (this.tokenizer.inForeignNode) {
            this._insertCharacters(token);
            return;
        }
        switch (this.insertionMode) {
            case InsertionMode.IN_HEAD:
            case InsertionMode.IN_HEAD_NO_SCRIPT:
            case InsertionMode.AFTER_HEAD:
            case InsertionMode.TEXT:
            case InsertionMode.IN_COLUMN_GROUP:
            case InsertionMode.IN_SELECT:
            case InsertionMode.IN_SELECT_IN_TABLE:
            case InsertionMode.IN_FRAMESET:
            case InsertionMode.AFTER_FRAMESET: {
                this._insertCharacters(token);
                break;
            }
            case InsertionMode.IN_BODY:
            case InsertionMode.IN_CAPTION:
            case InsertionMode.IN_CELL:
            case InsertionMode.IN_TEMPLATE:
            case InsertionMode.AFTER_BODY:
            case InsertionMode.AFTER_AFTER_BODY:
            case InsertionMode.AFTER_AFTER_FRAMESET: {
                whitespaceCharacterInBody(this, token);
                break;
            }
            case InsertionMode.IN_TABLE:
            case InsertionMode.IN_TABLE_BODY:
            case InsertionMode.IN_ROW: {
                characterInTable(this, token);
                break;
            }
            case InsertionMode.IN_TABLE_TEXT: {
                whitespaceCharacterInTableText(this, token);
                break;
            }
            // Do nothing
        }
    }
}
//Adoption agency algorithm
//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/tree-construction.html#adoptionAgency)
//------------------------------------------------------------------
//Steps 5-8 of the algorithm
function aaObtainFormattingElementEntry(p, token) {
    let formattingElementEntry = p.activeFormattingElements.getElementEntryInScopeWithTagName(token.tagName);
    if (formattingElementEntry) {
        if (!p.openElements.contains(formattingElementEntry.element)) {
            p.activeFormattingElements.removeEntry(formattingElementEntry);
            formattingElementEntry = null;
        }
        else if (!p.openElements.hasInScope(token.tagID)) {
            formattingElementEntry = null;
        }
    }
    else {
        genericEndTagInBody(p, token);
    }
    return formattingElementEntry;
}
//Steps 9 and 10 of the algorithm
function aaObtainFurthestBlock(p, formattingElementEntry) {
    let furthestBlock = null;
    let idx = p.openElements.stackTop;
    for (; idx >= 0; idx--) {
        const element = p.openElements.items[idx];
        if (element === formattingElementEntry.element) {
            break;
        }
        if (p._isSpecialElement(element, p.openElements.tagIDs[idx])) {
            furthestBlock = element;
        }
    }
    if (!furthestBlock) {
        p.openElements.shortenToLength(Math.max(idx, 0));
        p.activeFormattingElements.removeEntry(formattingElementEntry);
    }
    return furthestBlock;
}
//Step 13 of the algorithm
function aaInnerLoop(p, furthestBlock, formattingElement) {
    let lastElement = furthestBlock;
    let nextElement = p.openElements.getCommonAncestor(furthestBlock);
    for (let i = 0, element = nextElement; element !== formattingElement; i++, element = nextElement) {
        //NOTE: store the next element for the next loop iteration (it may be deleted from the stack by step 9.5)
        nextElement = p.openElements.getCommonAncestor(element);
        const elementEntry = p.activeFormattingElements.getElementEntry(element);
        const counterOverflow = elementEntry && i >= AA_INNER_LOOP_ITER;
        const shouldRemoveFromOpenElements = !elementEntry || counterOverflow;
        if (shouldRemoveFromOpenElements) {
            if (counterOverflow) {
                p.activeFormattingElements.removeEntry(elementEntry);
            }
            p.openElements.remove(element);
        }
        else {
            element = aaRecreateElementFromEntry(p, elementEntry);
            if (lastElement === furthestBlock) {
                p.activeFormattingElements.bookmark = elementEntry;
            }
            p.treeAdapter.detachNode(lastElement);
            p.treeAdapter.appendChild(element, lastElement);
            lastElement = element;
        }
    }
    return lastElement;
}
//Step 13.7 of the algorithm
function aaRecreateElementFromEntry(p, elementEntry) {
    const ns = p.treeAdapter.getNamespaceURI(elementEntry.element);
    const newElement = p.treeAdapter.createElement(elementEntry.token.tagName, ns, elementEntry.token.attrs);
    p.openElements.replace(elementEntry.element, newElement);
    elementEntry.element = newElement;
    return newElement;
}
//Step 14 of the algorithm
function aaInsertLastNodeInCommonAncestor(p, commonAncestor, lastElement) {
    const tn = p.treeAdapter.getTagName(commonAncestor);
    const tid = getTagID(tn);
    if (p._isElementCausesFosterParenting(tid)) {
        p._fosterParentElement(lastElement);
    }
    else {
        const ns = p.treeAdapter.getNamespaceURI(commonAncestor);
        if (tid === TAG_ID.TEMPLATE && ns === NS.HTML) {
            commonAncestor = p.treeAdapter.getTemplateContent(commonAncestor);
        }
        p.treeAdapter.appendChild(commonAncestor, lastElement);
    }
}
//Steps 15-19 of the algorithm
function aaReplaceFormattingElement(p, furthestBlock, formattingElementEntry) {
    const ns = p.treeAdapter.getNamespaceURI(formattingElementEntry.element);
    const { token } = formattingElementEntry;
    const newElement = p.treeAdapter.createElement(token.tagName, ns, token.attrs);
    p._adoptNodes(furthestBlock, newElement);
    p.treeAdapter.appendChild(furthestBlock, newElement);
    p.activeFormattingElements.insertElementAfterBookmark(newElement, token);
    p.activeFormattingElements.removeEntry(formattingElementEntry);
    p.openElements.remove(formattingElementEntry.element);
    p.openElements.insertAfter(furthestBlock, newElement, token.tagID);
}
//Algorithm entry point
function callAdoptionAgency(p, token) {
    for (let i = 0; i < AA_OUTER_LOOP_ITER; i++) {
        const formattingElementEntry = aaObtainFormattingElementEntry(p, token);
        if (!formattingElementEntry) {
            break;
        }
        const furthestBlock = aaObtainFurthestBlock(p, formattingElementEntry);
        if (!furthestBlock) {
            break;
        }
        p.activeFormattingElements.bookmark = formattingElementEntry;
        const lastElement = aaInnerLoop(p, furthestBlock, formattingElementEntry.element);
        const commonAncestor = p.openElements.getCommonAncestor(formattingElementEntry.element);
        p.treeAdapter.detachNode(lastElement);
        if (commonAncestor)
            aaInsertLastNodeInCommonAncestor(p, commonAncestor, lastElement);
        aaReplaceFormattingElement(p, furthestBlock, formattingElementEntry);
    }
}
//Generic token handlers
//------------------------------------------------------------------
function appendComment(p, token) {
    p._appendCommentNode(token, p.openElements.currentTmplContentOrNode);
}
function appendCommentToRootHtmlElement(p, token) {
    p._appendCommentNode(token, p.openElements.items[0]);
}
function appendCommentToDocument(p, token) {
    p._appendCommentNode(token, p.document);
}
function stopParsing(p, token) {
    p.stopped = true;
    // NOTE: Set end locations for elements that remain on the open element stack.
    if (token.location) {
        // NOTE: If we are not in a fragment, `html` and `body` will stay on the stack.
        // This is a problem, as we might overwrite their end position here.
        const target = p.fragmentContext ? 0 : 2;
        for (let i = p.openElements.stackTop; i >= target; i--) {
            p._setEndLocation(p.openElements.items[i], token);
        }
        // Handle `html` and `body`
        if (!p.fragmentContext && p.openElements.stackTop >= 0) {
            const htmlElement = p.openElements.items[0];
            const htmlLocation = p.treeAdapter.getNodeSourceCodeLocation(htmlElement);
            if (htmlLocation && !htmlLocation.endTag) {
                p._setEndLocation(htmlElement, token);
                if (p.openElements.stackTop >= 1) {
                    const bodyElement = p.openElements.items[1];
                    const bodyLocation = p.treeAdapter.getNodeSourceCodeLocation(bodyElement);
                    if (bodyLocation && !bodyLocation.endTag) {
                        p._setEndLocation(bodyElement, token);
                    }
                }
            }
        }
    }
}
// The "initial" insertion mode
//------------------------------------------------------------------
function doctypeInInitialMode(p, token) {
    p._setDocumentType(token);
    const mode = token.forceQuirks ? DOCUMENT_MODE.QUIRKS : getDocumentMode(token);
    if (!isConforming(token)) {
        p._err(token, ERR.nonConformingDoctype);
    }
    p.treeAdapter.setDocumentMode(p.document, mode);
    p.insertionMode = InsertionMode.BEFORE_HTML;
}
function tokenInInitialMode(p, token) {
    p._err(token, ERR.missingDoctype, true);
    p.treeAdapter.setDocumentMode(p.document, DOCUMENT_MODE.QUIRKS);
    p.insertionMode = InsertionMode.BEFORE_HTML;
    p._processToken(token);
}
// The "before html" insertion mode
//------------------------------------------------------------------
function startTagBeforeHtml(p, token) {
    if (token.tagID === TAG_ID.HTML) {
        p._insertElement(token, NS.HTML);
        p.insertionMode = InsertionMode.BEFORE_HEAD;
    }
    else {
        tokenBeforeHtml(p, token);
    }
}
function endTagBeforeHtml(p, token) {
    const tn = token.tagID;
    if (tn === TAG_ID.HTML || tn === TAG_ID.HEAD || tn === TAG_ID.BODY || tn === TAG_ID.BR) {
        tokenBeforeHtml(p, token);
    }
}
function tokenBeforeHtml(p, token) {
    p._insertFakeRootElement();
    p.insertionMode = InsertionMode.BEFORE_HEAD;
    p._processToken(token);
}
// The "before head" insertion mode
//------------------------------------------------------------------
function startTagBeforeHead(p, token) {
    switch (token.tagID) {
        case TAG_ID.HTML: {
            startTagInBody(p, token);
            break;
        }
        case TAG_ID.HEAD: {
            p._insertElement(token, NS.HTML);
            p.headElement = p.openElements.current;
            p.insertionMode = InsertionMode.IN_HEAD;
            break;
        }
        default: {
            tokenBeforeHead(p, token);
        }
    }
}
function endTagBeforeHead(p, token) {
    const tn = token.tagID;
    if (tn === TAG_ID.HEAD || tn === TAG_ID.BODY || tn === TAG_ID.HTML || tn === TAG_ID.BR) {
        tokenBeforeHead(p, token);
    }
    else {
        p._err(token, ERR.endTagWithoutMatchingOpenElement);
    }
}
function tokenBeforeHead(p, token) {
    p._insertFakeElement(TAG_NAMES.HEAD, TAG_ID.HEAD);
    p.headElement = p.openElements.current;
    p.insertionMode = InsertionMode.IN_HEAD;
    p._processToken(token);
}
// The "in head" insertion mode
//------------------------------------------------------------------
function startTagInHead(p, token) {
    switch (token.tagID) {
        case TAG_ID.HTML: {
            startTagInBody(p, token);
            break;
        }
        case TAG_ID.BASE:
        case TAG_ID.BASEFONT:
        case TAG_ID.BGSOUND:
        case TAG_ID.LINK:
        case TAG_ID.META: {
            p._appendElement(token, NS.HTML);
            token.ackSelfClosing = true;
            break;
        }
        case TAG_ID.TITLE: {
            p._switchToTextParsing(token, TokenizerMode.RCDATA);
            break;
        }
        case TAG_ID.NOSCRIPT: {
            if (p.options.scriptingEnabled) {
                p._switchToTextParsing(token, TokenizerMode.RAWTEXT);
            }
            else {
                p._insertElement(token, NS.HTML);
                p.insertionMode = InsertionMode.IN_HEAD_NO_SCRIPT;
            }
            break;
        }
        case TAG_ID.NOFRAMES:
        case TAG_ID.STYLE: {
            p._switchToTextParsing(token, TokenizerMode.RAWTEXT);
            break;
        }
        case TAG_ID.SCRIPT: {
            p._switchToTextParsing(token, TokenizerMode.SCRIPT_DATA);
            break;
        }
        case TAG_ID.TEMPLATE: {
            p._insertTemplate(token);
            p.activeFormattingElements.insertMarker();
            p.framesetOk = false;
            p.insertionMode = InsertionMode.IN_TEMPLATE;
            p.tmplInsertionModeStack.unshift(InsertionMode.IN_TEMPLATE);
            break;
        }
        case TAG_ID.HEAD: {
            p._err(token, ERR.misplacedStartTagForHeadElement);
            break;
        }
        default: {
            tokenInHead(p, token);
        }
    }
}
function endTagInHead(p, token) {
    switch (token.tagID) {
        case TAG_ID.HEAD: {
            p.openElements.pop();
            p.insertionMode = InsertionMode.AFTER_HEAD;
            break;
        }
        case TAG_ID.BODY:
        case TAG_ID.BR:
        case TAG_ID.HTML: {
            tokenInHead(p, token);
            break;
        }
        case TAG_ID.TEMPLATE: {
            templateEndTagInHead(p, token);
            break;
        }
        default: {
            p._err(token, ERR.endTagWithoutMatchingOpenElement);
        }
    }
}
function templateEndTagInHead(p, token) {
    if (p.openElements.tmplCount > 0) {
        p.openElements.generateImpliedEndTagsThoroughly();
        if (p.openElements.currentTagId !== TAG_ID.TEMPLATE) {
            p._err(token, ERR.closingOfElementWithOpenChildElements);
        }
        p.openElements.popUntilTagNamePopped(TAG_ID.TEMPLATE);
        p.activeFormattingElements.clearToLastMarker();
        p.tmplInsertionModeStack.shift();
        p._resetInsertionMode();
    }
    else {
        p._err(token, ERR.endTagWithoutMatchingOpenElement);
    }
}
function tokenInHead(p, token) {
    p.openElements.pop();
    p.insertionMode = InsertionMode.AFTER_HEAD;
    p._processToken(token);
}
// The "in head no script" insertion mode
//------------------------------------------------------------------
function startTagInHeadNoScript(p, token) {
    switch (token.tagID) {
        case TAG_ID.HTML: {
            startTagInBody(p, token);
            break;
        }
        case TAG_ID.BASEFONT:
        case TAG_ID.BGSOUND:
        case TAG_ID.HEAD:
        case TAG_ID.LINK:
        case TAG_ID.META:
        case TAG_ID.NOFRAMES:
        case TAG_ID.STYLE: {
            startTagInHead(p, token);
            break;
        }
        case TAG_ID.NOSCRIPT: {
            p._err(token, ERR.nestedNoscriptInHead);
            break;
        }
        default: {
            tokenInHeadNoScript(p, token);
        }
    }
}
function endTagInHeadNoScript(p, token) {
    switch (token.tagID) {
        case TAG_ID.NOSCRIPT: {
            p.openElements.pop();
            p.insertionMode = InsertionMode.IN_HEAD;
            break;
        }
        case TAG_ID.BR: {
            tokenInHeadNoScript(p, token);
            break;
        }
        default: {
            p._err(token, ERR.endTagWithoutMatchingOpenElement);
        }
    }
}
function tokenInHeadNoScript(p, token) {
    const errCode = token.type === TokenType.EOF ? ERR.openElementsLeftAfterEof : ERR.disallowedContentInNoscriptInHead;
    p._err(token, errCode);
    p.openElements.pop();
    p.insertionMode = InsertionMode.IN_HEAD;
    p._processToken(token);
}
// The "after head" insertion mode
//------------------------------------------------------------------
function startTagAfterHead(p, token) {
    switch (token.tagID) {
        case TAG_ID.HTML: {
            startTagInBody(p, token);
            break;
        }
        case TAG_ID.BODY: {
            p._insertElement(token, NS.HTML);
            p.framesetOk = false;
            p.insertionMode = InsertionMode.IN_BODY;
            break;
        }
        case TAG_ID.FRAMESET: {
            p._insertElement(token, NS.HTML);
            p.insertionMode = InsertionMode.IN_FRAMESET;
            break;
        }
        case TAG_ID.BASE:
        case TAG_ID.BASEFONT:
        case TAG_ID.BGSOUND:
        case TAG_ID.LINK:
        case TAG_ID.META:
        case TAG_ID.NOFRAMES:
        case TAG_ID.SCRIPT:
        case TAG_ID.STYLE:
        case TAG_ID.TEMPLATE:
        case TAG_ID.TITLE: {
            p._err(token, ERR.abandonedHeadElementChild);
            p.openElements.push(p.headElement, TAG_ID.HEAD);
            startTagInHead(p, token);
            p.openElements.remove(p.headElement);
            break;
        }
        case TAG_ID.HEAD: {
            p._err(token, ERR.misplacedStartTagForHeadElement);
            break;
        }
        default: {
            tokenAfterHead(p, token);
        }
    }
}
function endTagAfterHead(p, token) {
    switch (token.tagID) {
        case TAG_ID.BODY:
        case TAG_ID.HTML:
        case TAG_ID.BR: {
            tokenAfterHead(p, token);
            break;
        }
        case TAG_ID.TEMPLATE: {
            templateEndTagInHead(p, token);
            break;
        }
        default: {
            p._err(token, ERR.endTagWithoutMatchingOpenElement);
        }
    }
}
function tokenAfterHead(p, token) {
    p._insertFakeElement(TAG_NAMES.BODY, TAG_ID.BODY);
    p.insertionMode = InsertionMode.IN_BODY;
    modeInBody(p, token);
}
// The "in body" insertion mode
//------------------------------------------------------------------
function modeInBody(p, token) {
    switch (token.type) {
        case TokenType.CHARACTER: {
            characterInBody(p, token);
            break;
        }
        case TokenType.WHITESPACE_CHARACTER: {
            whitespaceCharacterInBody(p, token);
            break;
        }
        case TokenType.COMMENT: {
            appendComment(p, token);
            break;
        }
        case TokenType.START_TAG: {
            startTagInBody(p, token);
            break;
        }
        case TokenType.END_TAG: {
            endTagInBody(p, token);
            break;
        }
        case TokenType.EOF: {
            eofInBody(p, token);
            break;
        }
        // Do nothing
    }
}
function whitespaceCharacterInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertCharacters(token);
}
function characterInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertCharacters(token);
    p.framesetOk = false;
}
function htmlStartTagInBody(p, token) {
    if (p.openElements.tmplCount === 0) {
        p.treeAdapter.adoptAttributes(p.openElements.items[0], token.attrs);
    }
}
function bodyStartTagInBody(p, token) {
    const bodyElement = p.openElements.tryPeekProperlyNestedBodyElement();
    if (bodyElement && p.openElements.tmplCount === 0) {
        p.framesetOk = false;
        p.treeAdapter.adoptAttributes(bodyElement, token.attrs);
    }
}
function framesetStartTagInBody(p, token) {
    const bodyElement = p.openElements.tryPeekProperlyNestedBodyElement();
    if (p.framesetOk && bodyElement) {
        p.treeAdapter.detachNode(bodyElement);
        p.openElements.popAllUpToHtmlElement();
        p._insertElement(token, NS.HTML);
        p.insertionMode = InsertionMode.IN_FRAMESET;
    }
}
function addressStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope(TAG_ID.P)) {
        p._closePElement();
    }
    p._insertElement(token, NS.HTML);
}
function numberedHeaderStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope(TAG_ID.P)) {
        p._closePElement();
    }
    if (p.openElements.currentTagId !== undefined && NUMBERED_HEADERS.has(p.openElements.currentTagId)) {
        p.openElements.pop();
    }
    p._insertElement(token, NS.HTML);
}
function preStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope(TAG_ID.P)) {
        p._closePElement();
    }
    p._insertElement(token, NS.HTML);
    //NOTE: If the next token is a U+000A LINE FEED (LF) character token, then ignore that token and move
    //on to the next one. (Newlines at the start of pre blocks are ignored as an authoring convenience.)
    p.skipNextNewLine = true;
    p.framesetOk = false;
}
function formStartTagInBody(p, token) {
    const inTemplate = p.openElements.tmplCount > 0;
    if (!p.formElement || inTemplate) {
        if (p.openElements.hasInButtonScope(TAG_ID.P)) {
            p._closePElement();
        }
        p._insertElement(token, NS.HTML);
        if (!inTemplate) {
            p.formElement = p.openElements.current;
        }
    }
}
function listItemStartTagInBody(p, token) {
    p.framesetOk = false;
    const tn = token.tagID;
    for (let i = p.openElements.stackTop; i >= 0; i--) {
        const elementId = p.openElements.tagIDs[i];
        if ((tn === TAG_ID.LI && elementId === TAG_ID.LI) ||
            ((tn === TAG_ID.DD || tn === TAG_ID.DT) && (elementId === TAG_ID.DD || elementId === TAG_ID.DT))) {
            p.openElements.generateImpliedEndTagsWithExclusion(elementId);
            p.openElements.popUntilTagNamePopped(elementId);
            break;
        }
        if (elementId !== TAG_ID.ADDRESS &&
            elementId !== TAG_ID.DIV &&
            elementId !== TAG_ID.P &&
            p._isSpecialElement(p.openElements.items[i], elementId)) {
            break;
        }
    }
    if (p.openElements.hasInButtonScope(TAG_ID.P)) {
        p._closePElement();
    }
    p._insertElement(token, NS.HTML);
}
function plaintextStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope(TAG_ID.P)) {
        p._closePElement();
    }
    p._insertElement(token, NS.HTML);
    p.tokenizer.state = TokenizerMode.PLAINTEXT;
}
function buttonStartTagInBody(p, token) {
    if (p.openElements.hasInScope(TAG_ID.BUTTON)) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilTagNamePopped(TAG_ID.BUTTON);
    }
    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
    p.framesetOk = false;
}
function aStartTagInBody(p, token) {
    const activeElementEntry = p.activeFormattingElements.getElementEntryInScopeWithTagName(TAG_NAMES.A);
    if (activeElementEntry) {
        callAdoptionAgency(p, token);
        p.openElements.remove(activeElementEntry.element);
        p.activeFormattingElements.removeEntry(activeElementEntry);
    }
    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
    p.activeFormattingElements.pushElement(p.openElements.current, token);
}
function bStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
    p.activeFormattingElements.pushElement(p.openElements.current, token);
}
function nobrStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    if (p.openElements.hasInScope(TAG_ID.NOBR)) {
        callAdoptionAgency(p, token);
        p._reconstructActiveFormattingElements();
    }
    p._insertElement(token, NS.HTML);
    p.activeFormattingElements.pushElement(p.openElements.current, token);
}
function appletStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
    p.activeFormattingElements.insertMarker();
    p.framesetOk = false;
}
function tableStartTagInBody(p, token) {
    if (p.treeAdapter.getDocumentMode(p.document) !== DOCUMENT_MODE.QUIRKS && p.openElements.hasInButtonScope(TAG_ID.P)) {
        p._closePElement();
    }
    p._insertElement(token, NS.HTML);
    p.framesetOk = false;
    p.insertionMode = InsertionMode.IN_TABLE;
}
function areaStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._appendElement(token, NS.HTML);
    p.framesetOk = false;
    token.ackSelfClosing = true;
}
function isHiddenInput(token) {
    const inputType = getTokenAttr(token, ATTRS.TYPE);
    return inputType != null && inputType.toLowerCase() === HIDDEN_INPUT_TYPE;
}
function inputStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._appendElement(token, NS.HTML);
    if (!isHiddenInput(token)) {
        p.framesetOk = false;
    }
    token.ackSelfClosing = true;
}
function paramStartTagInBody(p, token) {
    p._appendElement(token, NS.HTML);
    token.ackSelfClosing = true;
}
function hrStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope(TAG_ID.P)) {
        p._closePElement();
    }
    p._appendElement(token, NS.HTML);
    p.framesetOk = false;
    token.ackSelfClosing = true;
}
function imageStartTagInBody(p, token) {
    token.tagName = TAG_NAMES.IMG;
    token.tagID = TAG_ID.IMG;
    areaStartTagInBody(p, token);
}
function textareaStartTagInBody(p, token) {
    p._insertElement(token, NS.HTML);
    //NOTE: If the next token is a U+000A LINE FEED (LF) character token, then ignore that token and move
    //on to the next one. (Newlines at the start of textarea elements are ignored as an authoring convenience.)
    p.skipNextNewLine = true;
    p.tokenizer.state = TokenizerMode.RCDATA;
    p.originalInsertionMode = p.insertionMode;
    p.framesetOk = false;
    p.insertionMode = InsertionMode.TEXT;
}
function xmpStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope(TAG_ID.P)) {
        p._closePElement();
    }
    p._reconstructActiveFormattingElements();
    p.framesetOk = false;
    p._switchToTextParsing(token, TokenizerMode.RAWTEXT);
}
function iframeStartTagInBody(p, token) {
    p.framesetOk = false;
    p._switchToTextParsing(token, TokenizerMode.RAWTEXT);
}
//NOTE: here we assume that we always act as a user agent with enabled plugins/frames, so we parse
//<noembed>/<noframes> as rawtext.
function rawTextStartTagInBody(p, token) {
    p._switchToTextParsing(token, TokenizerMode.RAWTEXT);
}
function selectStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
    p.framesetOk = false;
    p.insertionMode =
        p.insertionMode === InsertionMode.IN_TABLE ||
            p.insertionMode === InsertionMode.IN_CAPTION ||
            p.insertionMode === InsertionMode.IN_TABLE_BODY ||
            p.insertionMode === InsertionMode.IN_ROW ||
            p.insertionMode === InsertionMode.IN_CELL
            ? InsertionMode.IN_SELECT_IN_TABLE
            : InsertionMode.IN_SELECT;
}
function optgroupStartTagInBody(p, token) {
    if (p.openElements.currentTagId === TAG_ID.OPTION) {
        p.openElements.pop();
    }
    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
}
function rbStartTagInBody(p, token) {
    if (p.openElements.hasInScope(TAG_ID.RUBY)) {
        p.openElements.generateImpliedEndTags();
    }
    p._insertElement(token, NS.HTML);
}
function rtStartTagInBody(p, token) {
    if (p.openElements.hasInScope(TAG_ID.RUBY)) {
        p.openElements.generateImpliedEndTagsWithExclusion(TAG_ID.RTC);
    }
    p._insertElement(token, NS.HTML);
}
function mathStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    adjustTokenMathMLAttrs(token);
    adjustTokenXMLAttrs(token);
    if (token.selfClosing) {
        p._appendElement(token, NS.MATHML);
    }
    else {
        p._insertElement(token, NS.MATHML);
    }
    token.ackSelfClosing = true;
}
function svgStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    adjustTokenSVGAttrs(token);
    adjustTokenXMLAttrs(token);
    if (token.selfClosing) {
        p._appendElement(token, NS.SVG);
    }
    else {
        p._insertElement(token, NS.SVG);
    }
    token.ackSelfClosing = true;
}
function genericStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
}
function startTagInBody(p, token) {
    switch (token.tagID) {
        case TAG_ID.I:
        case TAG_ID.S:
        case TAG_ID.B:
        case TAG_ID.U:
        case TAG_ID.EM:
        case TAG_ID.TT:
        case TAG_ID.BIG:
        case TAG_ID.CODE:
        case TAG_ID.FONT:
        case TAG_ID.SMALL:
        case TAG_ID.STRIKE:
        case TAG_ID.STRONG: {
            bStartTagInBody(p, token);
            break;
        }
        case TAG_ID.A: {
            aStartTagInBody(p, token);
            break;
        }
        case TAG_ID.H1:
        case TAG_ID.H2:
        case TAG_ID.H3:
        case TAG_ID.H4:
        case TAG_ID.H5:
        case TAG_ID.H6: {
            numberedHeaderStartTagInBody(p, token);
            break;
        }
        case TAG_ID.P:
        case TAG_ID.DL:
        case TAG_ID.OL:
        case TAG_ID.UL:
        case TAG_ID.DIV:
        case TAG_ID.DIR:
        case TAG_ID.NAV:
        case TAG_ID.MAIN:
        case TAG_ID.MENU:
        case TAG_ID.ASIDE:
        case TAG_ID.CENTER:
        case TAG_ID.FIGURE:
        case TAG_ID.FOOTER:
        case TAG_ID.HEADER:
        case TAG_ID.HGROUP:
        case TAG_ID.DIALOG:
        case TAG_ID.DETAILS:
        case TAG_ID.ADDRESS:
        case TAG_ID.ARTICLE:
        case TAG_ID.SEARCH:
        case TAG_ID.SECTION:
        case TAG_ID.SUMMARY:
        case TAG_ID.FIELDSET:
        case TAG_ID.BLOCKQUOTE:
        case TAG_ID.FIGCAPTION: {
            addressStartTagInBody(p, token);
            break;
        }
        case TAG_ID.LI:
        case TAG_ID.DD:
        case TAG_ID.DT: {
            listItemStartTagInBody(p, token);
            break;
        }
        case TAG_ID.BR:
        case TAG_ID.IMG:
        case TAG_ID.WBR:
        case TAG_ID.AREA:
        case TAG_ID.EMBED:
        case TAG_ID.KEYGEN: {
            areaStartTagInBody(p, token);
            break;
        }
        case TAG_ID.HR: {
            hrStartTagInBody(p, token);
            break;
        }
        case TAG_ID.RB:
        case TAG_ID.RTC: {
            rbStartTagInBody(p, token);
            break;
        }
        case TAG_ID.RT:
        case TAG_ID.RP: {
            rtStartTagInBody(p, token);
            break;
        }
        case TAG_ID.PRE:
        case TAG_ID.LISTING: {
            preStartTagInBody(p, token);
            break;
        }
        case TAG_ID.XMP: {
            xmpStartTagInBody(p, token);
            break;
        }
        case TAG_ID.SVG: {
            svgStartTagInBody(p, token);
            break;
        }
        case TAG_ID.HTML: {
            htmlStartTagInBody(p, token);
            break;
        }
        case TAG_ID.BASE:
        case TAG_ID.LINK:
        case TAG_ID.META:
        case TAG_ID.STYLE:
        case TAG_ID.TITLE:
        case TAG_ID.SCRIPT:
        case TAG_ID.BGSOUND:
        case TAG_ID.BASEFONT:
        case TAG_ID.TEMPLATE: {
            startTagInHead(p, token);
            break;
        }
        case TAG_ID.BODY: {
            bodyStartTagInBody(p, token);
            break;
        }
        case TAG_ID.FORM: {
            formStartTagInBody(p, token);
            break;
        }
        case TAG_ID.NOBR: {
            nobrStartTagInBody(p, token);
            break;
        }
        case TAG_ID.MATH: {
            mathStartTagInBody(p, token);
            break;
        }
        case TAG_ID.TABLE: {
            tableStartTagInBody(p, token);
            break;
        }
        case TAG_ID.INPUT: {
            inputStartTagInBody(p, token);
            break;
        }
        case TAG_ID.PARAM:
        case TAG_ID.TRACK:
        case TAG_ID.SOURCE: {
            paramStartTagInBody(p, token);
            break;
        }
        case TAG_ID.IMAGE: {
            imageStartTagInBody(p, token);
            break;
        }
        case TAG_ID.BUTTON: {
            buttonStartTagInBody(p, token);
            break;
        }
        case TAG_ID.APPLET:
        case TAG_ID.OBJECT:
        case TAG_ID.MARQUEE: {
            appletStartTagInBody(p, token);
            break;
        }
        case TAG_ID.IFRAME: {
            iframeStartTagInBody(p, token);
            break;
        }
        case TAG_ID.SELECT: {
            selectStartTagInBody(p, token);
            break;
        }
        case TAG_ID.OPTION:
        case TAG_ID.OPTGROUP: {
            optgroupStartTagInBody(p, token);
            break;
        }
        case TAG_ID.NOEMBED:
        case TAG_ID.NOFRAMES: {
            rawTextStartTagInBody(p, token);
            break;
        }
        case TAG_ID.FRAMESET: {
            framesetStartTagInBody(p, token);
            break;
        }
        case TAG_ID.TEXTAREA: {
            textareaStartTagInBody(p, token);
            break;
        }
        case TAG_ID.NOSCRIPT: {
            if (p.options.scriptingEnabled) {
                rawTextStartTagInBody(p, token);
            }
            else {
                genericStartTagInBody(p, token);
            }
            break;
        }
        case TAG_ID.PLAINTEXT: {
            plaintextStartTagInBody(p, token);
            break;
        }
        case TAG_ID.COL:
        case TAG_ID.TH:
        case TAG_ID.TD:
        case TAG_ID.TR:
        case TAG_ID.HEAD:
        case TAG_ID.FRAME:
        case TAG_ID.TBODY:
        case TAG_ID.TFOOT:
        case TAG_ID.THEAD:
        case TAG_ID.CAPTION:
        case TAG_ID.COLGROUP: {
            // Ignore token
            break;
        }
        default: {
            genericStartTagInBody(p, token);
        }
    }
}
function bodyEndTagInBody(p, token) {
    if (p.openElements.hasInScope(TAG_ID.BODY)) {
        p.insertionMode = InsertionMode.AFTER_BODY;
        //NOTE: <body> is never popped from the stack, so we need to updated
        //the end location explicitly.
        if (p.options.sourceCodeLocationInfo) {
            const bodyElement = p.openElements.tryPeekProperlyNestedBodyElement();
            if (bodyElement) {
                p._setEndLocation(bodyElement, token);
            }
        }
    }
}
function htmlEndTagInBody(p, token) {
    if (p.openElements.hasInScope(TAG_ID.BODY)) {
        p.insertionMode = InsertionMode.AFTER_BODY;
        endTagAfterBody(p, token);
    }
}
function addressEndTagInBody(p, token) {
    const tn = token.tagID;
    if (p.openElements.hasInScope(tn)) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilTagNamePopped(tn);
    }
}
function formEndTagInBody(p) {
    const inTemplate = p.openElements.tmplCount > 0;
    const { formElement } = p;
    if (!inTemplate) {
        p.formElement = null;
    }
    if ((formElement || inTemplate) && p.openElements.hasInScope(TAG_ID.FORM)) {
        p.openElements.generateImpliedEndTags();
        if (inTemplate) {
            p.openElements.popUntilTagNamePopped(TAG_ID.FORM);
        }
        else if (formElement) {
            p.openElements.remove(formElement);
        }
    }
}
function pEndTagInBody(p) {
    if (!p.openElements.hasInButtonScope(TAG_ID.P)) {
        p._insertFakeElement(TAG_NAMES.P, TAG_ID.P);
    }
    p._closePElement();
}
function liEndTagInBody(p) {
    if (p.openElements.hasInListItemScope(TAG_ID.LI)) {
        p.openElements.generateImpliedEndTagsWithExclusion(TAG_ID.LI);
        p.openElements.popUntilTagNamePopped(TAG_ID.LI);
    }
}
function ddEndTagInBody(p, token) {
    const tn = token.tagID;
    if (p.openElements.hasInScope(tn)) {
        p.openElements.generateImpliedEndTagsWithExclusion(tn);
        p.openElements.popUntilTagNamePopped(tn);
    }
}
function numberedHeaderEndTagInBody(p) {
    if (p.openElements.hasNumberedHeaderInScope()) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilNumberedHeaderPopped();
    }
}
function appletEndTagInBody(p, token) {
    const tn = token.tagID;
    if (p.openElements.hasInScope(tn)) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilTagNamePopped(tn);
        p.activeFormattingElements.clearToLastMarker();
    }
}
function brEndTagInBody(p) {
    p._reconstructActiveFormattingElements();
    p._insertFakeElement(TAG_NAMES.BR, TAG_ID.BR);
    p.openElements.pop();
    p.framesetOk = false;
}
function genericEndTagInBody(p, token) {
    const tn = token.tagName;
    const tid = token.tagID;
    for (let i = p.openElements.stackTop; i > 0; i--) {
        const element = p.openElements.items[i];
        const elementId = p.openElements.tagIDs[i];
        // Compare the tag name here, as the tag might not be a known tag with an ID.
        if (tid === elementId && (tid !== TAG_ID.UNKNOWN || p.treeAdapter.getTagName(element) === tn)) {
            p.openElements.generateImpliedEndTagsWithExclusion(tid);
            if (p.openElements.stackTop >= i)
                p.openElements.shortenToLength(i);
            break;
        }
        if (p._isSpecialElement(element, elementId)) {
            break;
        }
    }
}
function endTagInBody(p, token) {
    switch (token.tagID) {
        case TAG_ID.A:
        case TAG_ID.B:
        case TAG_ID.I:
        case TAG_ID.S:
        case TAG_ID.U:
        case TAG_ID.EM:
        case TAG_ID.TT:
        case TAG_ID.BIG:
        case TAG_ID.CODE:
        case TAG_ID.FONT:
        case TAG_ID.NOBR:
        case TAG_ID.SMALL:
        case TAG_ID.STRIKE:
        case TAG_ID.STRONG: {
            callAdoptionAgency(p, token);
            break;
        }
        case TAG_ID.P: {
            pEndTagInBody(p);
            break;
        }
        case TAG_ID.DL:
        case TAG_ID.UL:
        case TAG_ID.OL:
        case TAG_ID.DIR:
        case TAG_ID.DIV:
        case TAG_ID.NAV:
        case TAG_ID.PRE:
        case TAG_ID.MAIN:
        case TAG_ID.MENU:
        case TAG_ID.ASIDE:
        case TAG_ID.BUTTON:
        case TAG_ID.CENTER:
        case TAG_ID.FIGURE:
        case TAG_ID.FOOTER:
        case TAG_ID.HEADER:
        case TAG_ID.HGROUP:
        case TAG_ID.DIALOG:
        case TAG_ID.ADDRESS:
        case TAG_ID.ARTICLE:
        case TAG_ID.DETAILS:
        case TAG_ID.SEARCH:
        case TAG_ID.SECTION:
        case TAG_ID.SUMMARY:
        case TAG_ID.LISTING:
        case TAG_ID.FIELDSET:
        case TAG_ID.BLOCKQUOTE:
        case TAG_ID.FIGCAPTION: {
            addressEndTagInBody(p, token);
            break;
        }
        case TAG_ID.LI: {
            liEndTagInBody(p);
            break;
        }
        case TAG_ID.DD:
        case TAG_ID.DT: {
            ddEndTagInBody(p, token);
            break;
        }
        case TAG_ID.H1:
        case TAG_ID.H2:
        case TAG_ID.H3:
        case TAG_ID.H4:
        case TAG_ID.H5:
        case TAG_ID.H6: {
            numberedHeaderEndTagInBody(p);
            break;
        }
        case TAG_ID.BR: {
            brEndTagInBody(p);
            break;
        }
        case TAG_ID.BODY: {
            bodyEndTagInBody(p, token);
            break;
        }
        case TAG_ID.HTML: {
            htmlEndTagInBody(p, token);
            break;
        }
        case TAG_ID.FORM: {
            formEndTagInBody(p);
            break;
        }
        case TAG_ID.APPLET:
        case TAG_ID.OBJECT:
        case TAG_ID.MARQUEE: {
            appletEndTagInBody(p, token);
            break;
        }
        case TAG_ID.TEMPLATE: {
            templateEndTagInHead(p, token);
            break;
        }
        default: {
            genericEndTagInBody(p, token);
        }
    }
}
function eofInBody(p, token) {
    if (p.tmplInsertionModeStack.length > 0) {
        eofInTemplate(p, token);
    }
    else {
        stopParsing(p, token);
    }
}
// The "text" insertion mode
//------------------------------------------------------------------
function endTagInText(p, token) {
    var _a;
    if (token.tagID === TAG_ID.SCRIPT) {
        (_a = p.scriptHandler) === null || _a === void 0 ? void 0 : _a.call(p, p.openElements.current);
    }
    p.openElements.pop();
    p.insertionMode = p.originalInsertionMode;
}
function eofInText(p, token) {
    p._err(token, ERR.eofInElementThatCanContainOnlyText);
    p.openElements.pop();
    p.insertionMode = p.originalInsertionMode;
    p.onEof(token);
}
// The "in table" insertion mode
//------------------------------------------------------------------
function characterInTable(p, token) {
    if (p.openElements.currentTagId !== undefined && TABLE_STRUCTURE_TAGS.has(p.openElements.currentTagId)) {
        p.pendingCharacterTokens.length = 0;
        p.hasNonWhitespacePendingCharacterToken = false;
        p.originalInsertionMode = p.insertionMode;
        p.insertionMode = InsertionMode.IN_TABLE_TEXT;
        switch (token.type) {
            case TokenType.CHARACTER: {
                characterInTableText(p, token);
                break;
            }
            case TokenType.WHITESPACE_CHARACTER: {
                whitespaceCharacterInTableText(p, token);
                break;
            }
            // Ignore null
        }
    }
    else {
        tokenInTable(p, token);
    }
}
function captionStartTagInTable(p, token) {
    p.openElements.clearBackToTableContext();
    p.activeFormattingElements.insertMarker();
    p._insertElement(token, NS.HTML);
    p.insertionMode = InsertionMode.IN_CAPTION;
}
function colgroupStartTagInTable(p, token) {
    p.openElements.clearBackToTableContext();
    p._insertElement(token, NS.HTML);
    p.insertionMode = InsertionMode.IN_COLUMN_GROUP;
}
function colStartTagInTable(p, token) {
    p.openElements.clearBackToTableContext();
    p._insertFakeElement(TAG_NAMES.COLGROUP, TAG_ID.COLGROUP);
    p.insertionMode = InsertionMode.IN_COLUMN_GROUP;
    startTagInColumnGroup(p, token);
}
function tbodyStartTagInTable(p, token) {
    p.openElements.clearBackToTableContext();
    p._insertElement(token, NS.HTML);
    p.insertionMode = InsertionMode.IN_TABLE_BODY;
}
function tdStartTagInTable(p, token) {
    p.openElements.clearBackToTableContext();
    p._insertFakeElement(TAG_NAMES.TBODY, TAG_ID.TBODY);
    p.insertionMode = InsertionMode.IN_TABLE_BODY;
    startTagInTableBody(p, token);
}
function tableStartTagInTable(p, token) {
    if (p.openElements.hasInTableScope(TAG_ID.TABLE)) {
        p.openElements.popUntilTagNamePopped(TAG_ID.TABLE);
        p._resetInsertionMode();
        p._processStartTag(token);
    }
}
function inputStartTagInTable(p, token) {
    if (isHiddenInput(token)) {
        p._appendElement(token, NS.HTML);
    }
    else {
        tokenInTable(p, token);
    }
    token.ackSelfClosing = true;
}
function formStartTagInTable(p, token) {
    if (!p.formElement && p.openElements.tmplCount === 0) {
        p._insertElement(token, NS.HTML);
        p.formElement = p.openElements.current;
        p.openElements.pop();
    }
}
function startTagInTable(p, token) {
    switch (token.tagID) {
        case TAG_ID.TD:
        case TAG_ID.TH:
        case TAG_ID.TR: {
            tdStartTagInTable(p, token);
            break;
        }
        case TAG_ID.STYLE:
        case TAG_ID.SCRIPT:
        case TAG_ID.TEMPLATE: {
            startTagInHead(p, token);
            break;
        }
        case TAG_ID.COL: {
            colStartTagInTable(p, token);
            break;
        }
        case TAG_ID.FORM: {
            formStartTagInTable(p, token);
            break;
        }
        case TAG_ID.TABLE: {
            tableStartTagInTable(p, token);
            break;
        }
        case TAG_ID.TBODY:
        case TAG_ID.TFOOT:
        case TAG_ID.THEAD: {
            tbodyStartTagInTable(p, token);
            break;
        }
        case TAG_ID.INPUT: {
            inputStartTagInTable(p, token);
            break;
        }
        case TAG_ID.CAPTION: {
            captionStartTagInTable(p, token);
            break;
        }
        case TAG_ID.COLGROUP: {
            colgroupStartTagInTable(p, token);
            break;
        }
        default: {
            tokenInTable(p, token);
        }
    }
}
function endTagInTable(p, token) {
    switch (token.tagID) {
        case TAG_ID.TABLE: {
            if (p.openElements.hasInTableScope(TAG_ID.TABLE)) {
                p.openElements.popUntilTagNamePopped(TAG_ID.TABLE);
                p._resetInsertionMode();
            }
            break;
        }
        case TAG_ID.TEMPLATE: {
            templateEndTagInHead(p, token);
            break;
        }
        case TAG_ID.BODY:
        case TAG_ID.CAPTION:
        case TAG_ID.COL:
        case TAG_ID.COLGROUP:
        case TAG_ID.HTML:
        case TAG_ID.TBODY:
        case TAG_ID.TD:
        case TAG_ID.TFOOT:
        case TAG_ID.TH:
        case TAG_ID.THEAD:
        case TAG_ID.TR: {
            // Ignore token
            break;
        }
        default: {
            tokenInTable(p, token);
        }
    }
}
function tokenInTable(p, token) {
    const savedFosterParentingState = p.fosterParentingEnabled;
    p.fosterParentingEnabled = true;
    // Process token in `In Body` mode
    modeInBody(p, token);
    p.fosterParentingEnabled = savedFosterParentingState;
}
// The "in table text" insertion mode
//------------------------------------------------------------------
function whitespaceCharacterInTableText(p, token) {
    p.pendingCharacterTokens.push(token);
}
function characterInTableText(p, token) {
    p.pendingCharacterTokens.push(token);
    p.hasNonWhitespacePendingCharacterToken = true;
}
function tokenInTableText(p, token) {
    let i = 0;
    if (p.hasNonWhitespacePendingCharacterToken) {
        for (; i < p.pendingCharacterTokens.length; i++) {
            tokenInTable(p, p.pendingCharacterTokens[i]);
        }
    }
    else {
        for (; i < p.pendingCharacterTokens.length; i++) {
            p._insertCharacters(p.pendingCharacterTokens[i]);
        }
    }
    p.insertionMode = p.originalInsertionMode;
    p._processToken(token);
}
// The "in caption" insertion mode
//------------------------------------------------------------------
const TABLE_VOID_ELEMENTS = new Set([TAG_ID.CAPTION, TAG_ID.COL, TAG_ID.COLGROUP, TAG_ID.TBODY, TAG_ID.TD, TAG_ID.TFOOT, TAG_ID.TH, TAG_ID.THEAD, TAG_ID.TR]);
function startTagInCaption(p, token) {
    const tn = token.tagID;
    if (TABLE_VOID_ELEMENTS.has(tn)) {
        if (p.openElements.hasInTableScope(TAG_ID.CAPTION)) {
            p.openElements.generateImpliedEndTags();
            p.openElements.popUntilTagNamePopped(TAG_ID.CAPTION);
            p.activeFormattingElements.clearToLastMarker();
            p.insertionMode = InsertionMode.IN_TABLE;
            startTagInTable(p, token);
        }
    }
    else {
        startTagInBody(p, token);
    }
}
function endTagInCaption(p, token) {
    const tn = token.tagID;
    switch (tn) {
        case TAG_ID.CAPTION:
        case TAG_ID.TABLE: {
            if (p.openElements.hasInTableScope(TAG_ID.CAPTION)) {
                p.openElements.generateImpliedEndTags();
                p.openElements.popUntilTagNamePopped(TAG_ID.CAPTION);
                p.activeFormattingElements.clearToLastMarker();
                p.insertionMode = InsertionMode.IN_TABLE;
                if (tn === TAG_ID.TABLE) {
                    endTagInTable(p, token);
                }
            }
            break;
        }
        case TAG_ID.BODY:
        case TAG_ID.COL:
        case TAG_ID.COLGROUP:
        case TAG_ID.HTML:
        case TAG_ID.TBODY:
        case TAG_ID.TD:
        case TAG_ID.TFOOT:
        case TAG_ID.TH:
        case TAG_ID.THEAD:
        case TAG_ID.TR: {
            // Ignore token
            break;
        }
        default: {
            endTagInBody(p, token);
        }
    }
}
// The "in column group" insertion mode
//------------------------------------------------------------------
function startTagInColumnGroup(p, token) {
    switch (token.tagID) {
        case TAG_ID.HTML: {
            startTagInBody(p, token);
            break;
        }
        case TAG_ID.COL: {
            p._appendElement(token, NS.HTML);
            token.ackSelfClosing = true;
            break;
        }
        case TAG_ID.TEMPLATE: {
            startTagInHead(p, token);
            break;
        }
        default: {
            tokenInColumnGroup(p, token);
        }
    }
}
function endTagInColumnGroup(p, token) {
    switch (token.tagID) {
        case TAG_ID.COLGROUP: {
            if (p.openElements.currentTagId === TAG_ID.COLGROUP) {
                p.openElements.pop();
                p.insertionMode = InsertionMode.IN_TABLE;
            }
            break;
        }
        case TAG_ID.TEMPLATE: {
            templateEndTagInHead(p, token);
            break;
        }
        case TAG_ID.COL: {
            // Ignore token
            break;
        }
        default: {
            tokenInColumnGroup(p, token);
        }
    }
}
function tokenInColumnGroup(p, token) {
    if (p.openElements.currentTagId === TAG_ID.COLGROUP) {
        p.openElements.pop();
        p.insertionMode = InsertionMode.IN_TABLE;
        p._processToken(token);
    }
}
// The "in table body" insertion mode
//------------------------------------------------------------------
function startTagInTableBody(p, token) {
    switch (token.tagID) {
        case TAG_ID.TR: {
            p.openElements.clearBackToTableBodyContext();
            p._insertElement(token, NS.HTML);
            p.insertionMode = InsertionMode.IN_ROW;
            break;
        }
        case TAG_ID.TH:
        case TAG_ID.TD: {
            p.openElements.clearBackToTableBodyContext();
            p._insertFakeElement(TAG_NAMES.TR, TAG_ID.TR);
            p.insertionMode = InsertionMode.IN_ROW;
            startTagInRow(p, token);
            break;
        }
        case TAG_ID.CAPTION:
        case TAG_ID.COL:
        case TAG_ID.COLGROUP:
        case TAG_ID.TBODY:
        case TAG_ID.TFOOT:
        case TAG_ID.THEAD: {
            if (p.openElements.hasTableBodyContextInTableScope()) {
                p.openElements.clearBackToTableBodyContext();
                p.openElements.pop();
                p.insertionMode = InsertionMode.IN_TABLE;
                startTagInTable(p, token);
            }
            break;
        }
        default: {
            startTagInTable(p, token);
        }
    }
}
function endTagInTableBody(p, token) {
    const tn = token.tagID;
    switch (token.tagID) {
        case TAG_ID.TBODY:
        case TAG_ID.TFOOT:
        case TAG_ID.THEAD: {
            if (p.openElements.hasInTableScope(tn)) {
                p.openElements.clearBackToTableBodyContext();
                p.openElements.pop();
                p.insertionMode = InsertionMode.IN_TABLE;
            }
            break;
        }
        case TAG_ID.TABLE: {
            if (p.openElements.hasTableBodyContextInTableScope()) {
                p.openElements.clearBackToTableBodyContext();
                p.openElements.pop();
                p.insertionMode = InsertionMode.IN_TABLE;
                endTagInTable(p, token);
            }
            break;
        }
        case TAG_ID.BODY:
        case TAG_ID.CAPTION:
        case TAG_ID.COL:
        case TAG_ID.COLGROUP:
        case TAG_ID.HTML:
        case TAG_ID.TD:
        case TAG_ID.TH:
        case TAG_ID.TR: {
            // Ignore token
            break;
        }
        default: {
            endTagInTable(p, token);
        }
    }
}
// The "in row" insertion mode
//------------------------------------------------------------------
function startTagInRow(p, token) {
    switch (token.tagID) {
        case TAG_ID.TH:
        case TAG_ID.TD: {
            p.openElements.clearBackToTableRowContext();
            p._insertElement(token, NS.HTML);
            p.insertionMode = InsertionMode.IN_CELL;
            p.activeFormattingElements.insertMarker();
            break;
        }
        case TAG_ID.CAPTION:
        case TAG_ID.COL:
        case TAG_ID.COLGROUP:
        case TAG_ID.TBODY:
        case TAG_ID.TFOOT:
        case TAG_ID.THEAD:
        case TAG_ID.TR: {
            if (p.openElements.hasInTableScope(TAG_ID.TR)) {
                p.openElements.clearBackToTableRowContext();
                p.openElements.pop();
                p.insertionMode = InsertionMode.IN_TABLE_BODY;
                startTagInTableBody(p, token);
            }
            break;
        }
        default: {
            startTagInTable(p, token);
        }
    }
}
function endTagInRow(p, token) {
    switch (token.tagID) {
        case TAG_ID.TR: {
            if (p.openElements.hasInTableScope(TAG_ID.TR)) {
                p.openElements.clearBackToTableRowContext();
                p.openElements.pop();
                p.insertionMode = InsertionMode.IN_TABLE_BODY;
            }
            break;
        }
        case TAG_ID.TABLE: {
            if (p.openElements.hasInTableScope(TAG_ID.TR)) {
                p.openElements.clearBackToTableRowContext();
                p.openElements.pop();
                p.insertionMode = InsertionMode.IN_TABLE_BODY;
                endTagInTableBody(p, token);
            }
            break;
        }
        case TAG_ID.TBODY:
        case TAG_ID.TFOOT:
        case TAG_ID.THEAD: {
            if (p.openElements.hasInTableScope(token.tagID) || p.openElements.hasInTableScope(TAG_ID.TR)) {
                p.openElements.clearBackToTableRowContext();
                p.openElements.pop();
                p.insertionMode = InsertionMode.IN_TABLE_BODY;
                endTagInTableBody(p, token);
            }
            break;
        }
        case TAG_ID.BODY:
        case TAG_ID.CAPTION:
        case TAG_ID.COL:
        case TAG_ID.COLGROUP:
        case TAG_ID.HTML:
        case TAG_ID.TD:
        case TAG_ID.TH: {
            // Ignore end tag
            break;
        }
        default: {
            endTagInTable(p, token);
        }
    }
}
// The "in cell" insertion mode
//------------------------------------------------------------------
function startTagInCell(p, token) {
    const tn = token.tagID;
    if (TABLE_VOID_ELEMENTS.has(tn)) {
        if (p.openElements.hasInTableScope(TAG_ID.TD) || p.openElements.hasInTableScope(TAG_ID.TH)) {
            p._closeTableCell();
            startTagInRow(p, token);
        }
    }
    else {
        startTagInBody(p, token);
    }
}
function endTagInCell(p, token) {
    const tn = token.tagID;
    switch (tn) {
        case TAG_ID.TD:
        case TAG_ID.TH: {
            if (p.openElements.hasInTableScope(tn)) {
                p.openElements.generateImpliedEndTags();
                p.openElements.popUntilTagNamePopped(tn);
                p.activeFormattingElements.clearToLastMarker();
                p.insertionMode = InsertionMode.IN_ROW;
            }
            break;
        }
        case TAG_ID.TABLE:
        case TAG_ID.TBODY:
        case TAG_ID.TFOOT:
        case TAG_ID.THEAD:
        case TAG_ID.TR: {
            if (p.openElements.hasInTableScope(tn)) {
                p._closeTableCell();
                endTagInRow(p, token);
            }
            break;
        }
        case TAG_ID.BODY:
        case TAG_ID.CAPTION:
        case TAG_ID.COL:
        case TAG_ID.COLGROUP:
        case TAG_ID.HTML: {
            // Ignore token
            break;
        }
        default: {
            endTagInBody(p, token);
        }
    }
}
// The "in select" insertion mode
//------------------------------------------------------------------
function startTagInSelect(p, token) {
    switch (token.tagID) {
        case TAG_ID.HTML: {
            startTagInBody(p, token);
            break;
        }
        case TAG_ID.OPTION: {
            if (p.openElements.currentTagId === TAG_ID.OPTION) {
                p.openElements.pop();
            }
            p._insertElement(token, NS.HTML);
            break;
        }
        case TAG_ID.OPTGROUP: {
            if (p.openElements.currentTagId === TAG_ID.OPTION) {
                p.openElements.pop();
            }
            if (p.openElements.currentTagId === TAG_ID.OPTGROUP) {
                p.openElements.pop();
            }
            p._insertElement(token, NS.HTML);
            break;
        }
        case TAG_ID.HR: {
            if (p.openElements.currentTagId === TAG_ID.OPTION) {
                p.openElements.pop();
            }
            if (p.openElements.currentTagId === TAG_ID.OPTGROUP) {
                p.openElements.pop();
            }
            p._appendElement(token, NS.HTML);
            token.ackSelfClosing = true;
            break;
        }
        case TAG_ID.INPUT:
        case TAG_ID.KEYGEN:
        case TAG_ID.TEXTAREA:
        case TAG_ID.SELECT: {
            if (p.openElements.hasInSelectScope(TAG_ID.SELECT)) {
                p.openElements.popUntilTagNamePopped(TAG_ID.SELECT);
                p._resetInsertionMode();
                if (token.tagID !== TAG_ID.SELECT) {
                    p._processStartTag(token);
                }
            }
            break;
        }
        case TAG_ID.SCRIPT:
        case TAG_ID.TEMPLATE: {
            startTagInHead(p, token);
            break;
        }
        // Do nothing
    }
}
function endTagInSelect(p, token) {
    switch (token.tagID) {
        case TAG_ID.OPTGROUP: {
            if (p.openElements.stackTop > 0 &&
                p.openElements.currentTagId === TAG_ID.OPTION &&
                p.openElements.tagIDs[p.openElements.stackTop - 1] === TAG_ID.OPTGROUP) {
                p.openElements.pop();
            }
            if (p.openElements.currentTagId === TAG_ID.OPTGROUP) {
                p.openElements.pop();
            }
            break;
        }
        case TAG_ID.OPTION: {
            if (p.openElements.currentTagId === TAG_ID.OPTION) {
                p.openElements.pop();
            }
            break;
        }
        case TAG_ID.SELECT: {
            if (p.openElements.hasInSelectScope(TAG_ID.SELECT)) {
                p.openElements.popUntilTagNamePopped(TAG_ID.SELECT);
                p._resetInsertionMode();
            }
            break;
        }
        case TAG_ID.TEMPLATE: {
            templateEndTagInHead(p, token);
            break;
        }
        // Do nothing
    }
}
// The "in select in table" insertion mode
//------------------------------------------------------------------
function startTagInSelectInTable(p, token) {
    const tn = token.tagID;
    if (tn === TAG_ID.CAPTION ||
        tn === TAG_ID.TABLE ||
        tn === TAG_ID.TBODY ||
        tn === TAG_ID.TFOOT ||
        tn === TAG_ID.THEAD ||
        tn === TAG_ID.TR ||
        tn === TAG_ID.TD ||
        tn === TAG_ID.TH) {
        p.openElements.popUntilTagNamePopped(TAG_ID.SELECT);
        p._resetInsertionMode();
        p._processStartTag(token);
    }
    else {
        startTagInSelect(p, token);
    }
}
function endTagInSelectInTable(p, token) {
    const tn = token.tagID;
    if (tn === TAG_ID.CAPTION ||
        tn === TAG_ID.TABLE ||
        tn === TAG_ID.TBODY ||
        tn === TAG_ID.TFOOT ||
        tn === TAG_ID.THEAD ||
        tn === TAG_ID.TR ||
        tn === TAG_ID.TD ||
        tn === TAG_ID.TH) {
        if (p.openElements.hasInTableScope(tn)) {
            p.openElements.popUntilTagNamePopped(TAG_ID.SELECT);
            p._resetInsertionMode();
            p.onEndTag(token);
        }
    }
    else {
        endTagInSelect(p, token);
    }
}
// The "in template" insertion mode
//------------------------------------------------------------------
function startTagInTemplate(p, token) {
    switch (token.tagID) {
        // First, handle tags that can start without a mode change
        case TAG_ID.BASE:
        case TAG_ID.BASEFONT:
        case TAG_ID.BGSOUND:
        case TAG_ID.LINK:
        case TAG_ID.META:
        case TAG_ID.NOFRAMES:
        case TAG_ID.SCRIPT:
        case TAG_ID.STYLE:
        case TAG_ID.TEMPLATE:
        case TAG_ID.TITLE: {
            startTagInHead(p, token);
            break;
        }
        // Re-process the token in the appropriate mode
        case TAG_ID.CAPTION:
        case TAG_ID.COLGROUP:
        case TAG_ID.TBODY:
        case TAG_ID.TFOOT:
        case TAG_ID.THEAD: {
            p.tmplInsertionModeStack[0] = InsertionMode.IN_TABLE;
            p.insertionMode = InsertionMode.IN_TABLE;
            startTagInTable(p, token);
            break;
        }
        case TAG_ID.COL: {
            p.tmplInsertionModeStack[0] = InsertionMode.IN_COLUMN_GROUP;
            p.insertionMode = InsertionMode.IN_COLUMN_GROUP;
            startTagInColumnGroup(p, token);
            break;
        }
        case TAG_ID.TR: {
            p.tmplInsertionModeStack[0] = InsertionMode.IN_TABLE_BODY;
            p.insertionMode = InsertionMode.IN_TABLE_BODY;
            startTagInTableBody(p, token);
            break;
        }
        case TAG_ID.TD:
        case TAG_ID.TH: {
            p.tmplInsertionModeStack[0] = InsertionMode.IN_ROW;
            p.insertionMode = InsertionMode.IN_ROW;
            startTagInRow(p, token);
            break;
        }
        default: {
            p.tmplInsertionModeStack[0] = InsertionMode.IN_BODY;
            p.insertionMode = InsertionMode.IN_BODY;
            startTagInBody(p, token);
        }
    }
}
function endTagInTemplate(p, token) {
    if (token.tagID === TAG_ID.TEMPLATE) {
        templateEndTagInHead(p, token);
    }
}
function eofInTemplate(p, token) {
    if (p.openElements.tmplCount > 0) {
        p.openElements.popUntilTagNamePopped(TAG_ID.TEMPLATE);
        p.activeFormattingElements.clearToLastMarker();
        p.tmplInsertionModeStack.shift();
        p._resetInsertionMode();
        p.onEof(token);
    }
    else {
        stopParsing(p, token);
    }
}
// The "after body" insertion mode
//------------------------------------------------------------------
function startTagAfterBody(p, token) {
    if (token.tagID === TAG_ID.HTML) {
        startTagInBody(p, token);
    }
    else {
        tokenAfterBody(p, token);
    }
}
function endTagAfterBody(p, token) {
    var _a;
    if (token.tagID === TAG_ID.HTML) {
        if (!p.fragmentContext) {
            p.insertionMode = InsertionMode.AFTER_AFTER_BODY;
        }
        //NOTE: <html> is never popped from the stack, so we need to updated
        //the end location explicitly.
        if (p.options.sourceCodeLocationInfo && p.openElements.tagIDs[0] === TAG_ID.HTML) {
            p._setEndLocation(p.openElements.items[0], token);
            // Update the body element, if it doesn't have an end tag
            const bodyElement = p.openElements.items[1];
            if (bodyElement && !((_a = p.treeAdapter.getNodeSourceCodeLocation(bodyElement)) === null || _a === void 0 ? void 0 : _a.endTag)) {
                p._setEndLocation(bodyElement, token);
            }
        }
    }
    else {
        tokenAfterBody(p, token);
    }
}
function tokenAfterBody(p, token) {
    p.insertionMode = InsertionMode.IN_BODY;
    modeInBody(p, token);
}
// The "in frameset" insertion mode
//------------------------------------------------------------------
function startTagInFrameset(p, token) {
    switch (token.tagID) {
        case TAG_ID.HTML: {
            startTagInBody(p, token);
            break;
        }
        case TAG_ID.FRAMESET: {
            p._insertElement(token, NS.HTML);
            break;
        }
        case TAG_ID.FRAME: {
            p._appendElement(token, NS.HTML);
            token.ackSelfClosing = true;
            break;
        }
        case TAG_ID.NOFRAMES: {
            startTagInHead(p, token);
            break;
        }
        // Do nothing
    }
}
function endTagInFrameset(p, token) {
    if (token.tagID === TAG_ID.FRAMESET && !p.openElements.isRootHtmlElementCurrent()) {
        p.openElements.pop();
        if (!p.fragmentContext && p.openElements.currentTagId !== TAG_ID.FRAMESET) {
            p.insertionMode = InsertionMode.AFTER_FRAMESET;
        }
    }
}
// The "after frameset" insertion mode
//------------------------------------------------------------------
function startTagAfterFrameset(p, token) {
    switch (token.tagID) {
        case TAG_ID.HTML: {
            startTagInBody(p, token);
            break;
        }
        case TAG_ID.NOFRAMES: {
            startTagInHead(p, token);
            break;
        }
        // Do nothing
    }
}
function endTagAfterFrameset(p, token) {
    if (token.tagID === TAG_ID.HTML) {
        p.insertionMode = InsertionMode.AFTER_AFTER_FRAMESET;
    }
}
// The "after after body" insertion mode
//------------------------------------------------------------------
function startTagAfterAfterBody(p, token) {
    if (token.tagID === TAG_ID.HTML) {
        startTagInBody(p, token);
    }
    else {
        tokenAfterAfterBody(p, token);
    }
}
function tokenAfterAfterBody(p, token) {
    p.insertionMode = InsertionMode.IN_BODY;
    modeInBody(p, token);
}
// The "after after frameset" insertion mode
//------------------------------------------------------------------
function startTagAfterAfterFrameset(p, token) {
    switch (token.tagID) {
        case TAG_ID.HTML: {
            startTagInBody(p, token);
            break;
        }
        case TAG_ID.NOFRAMES: {
            startTagInHead(p, token);
            break;
        }
        // Do nothing
    }
}
// The rules for parsing tokens in foreign content
//------------------------------------------------------------------
function nullCharacterInForeignContent(p, token) {
    token.chars = REPLACEMENT_CHARACTER;
    p._insertCharacters(token);
}
function characterInForeignContent(p, token) {
    p._insertCharacters(token);
    p.framesetOk = false;
}
function popUntilHtmlOrIntegrationPoint(p) {
    while (p.treeAdapter.getNamespaceURI(p.openElements.current) !== NS.HTML &&
        p.openElements.currentTagId !== undefined &&
        !p._isIntegrationPoint(p.openElements.currentTagId, p.openElements.current)) {
        p.openElements.pop();
    }
}
function startTagInForeignContent(p, token) {
    if (causesExit(token)) {
        popUntilHtmlOrIntegrationPoint(p);
        p._startTagOutsideForeignContent(token);
    }
    else {
        const current = p._getAdjustedCurrentElement();
        const currentNs = p.treeAdapter.getNamespaceURI(current);
        if (currentNs === NS.MATHML) {
            adjustTokenMathMLAttrs(token);
        }
        else if (currentNs === NS.SVG) {
            adjustTokenSVGTagName(token);
            adjustTokenSVGAttrs(token);
        }
        adjustTokenXMLAttrs(token);
        if (token.selfClosing) {
            p._appendElement(token, currentNs);
        }
        else {
            p._insertElement(token, currentNs);
        }
        token.ackSelfClosing = true;
    }
}
function endTagInForeignContent(p, token) {
    if (token.tagID === TAG_ID.P || token.tagID === TAG_ID.BR) {
        popUntilHtmlOrIntegrationPoint(p);
        p._endTagOutsideForeignContent(token);
        return;
    }
    for (let i = p.openElements.stackTop; i > 0; i--) {
        const element = p.openElements.items[i];
        if (p.treeAdapter.getNamespaceURI(element) === NS.HTML) {
            p._endTagOutsideForeignContent(token);
            break;
        }
        const tagName = p.treeAdapter.getTagName(element);
        if (tagName.toLowerCase() === token.tagName) {
            //NOTE: update the token tag name for `_setEndLocation`.
            token.tagName = tagName;
            p.openElements.shortenToLength(i);
            break;
        }
    }
}

/**
 * Creates a function that escapes all characters matched by the given regular
 * expression using the given map of characters to escape to their entities.
 *
 * @param regex Regular expression to match characters to escape.
 * @param map Map of characters to escape to their entities.
 *
 * @returns Function that escapes all characters matched by the given regular
 * expression using the given map of characters to escape to their entities.
 */
function getEscaper(regex, map) {
    return function escape(data) {
        let match;
        let lastIndex = 0;
        let result = "";
        while ((match = regex.exec(data))) {
            if (lastIndex !== match.index) {
                result += data.substring(lastIndex, match.index);
            }
            // We know that this character will be in the map.
            result += map.get(match[0].charCodeAt(0));
            // Every match will be of length 1
            lastIndex = match.index + 1;
        }
        return result + data.substring(lastIndex);
    };
}
/**
 * Encodes all characters that have to be escaped in HTML attributes,
 * following {@link https://html.spec.whatwg.org/multipage/parsing.html#escapingString}.
 *
 * @param data String to escape.
 */
const escapeAttribute = 
/* #__PURE__ */ getEscaper(/["&\u00A0]/g, new Map([
    [34, "&quot;"],
    [38, "&amp;"],
    [160, "&nbsp;"],
]));
/**
 * Encodes all characters that have to be escaped in HTML text,
 * following {@link https://html.spec.whatwg.org/multipage/parsing.html#escapingString}.
 *
 * @param data String to escape.
 */
const escapeText = /* #__PURE__ */ getEscaper(/[&<>\u00A0]/g, new Map([
    [38, "&amp;"],
    [60, "&lt;"],
    [62, "&gt;"],
    [160, "&nbsp;"],
]));

// Sets
const VOID_ELEMENTS = new Set([
    TAG_NAMES.AREA,
    TAG_NAMES.BASE,
    TAG_NAMES.BASEFONT,
    TAG_NAMES.BGSOUND,
    TAG_NAMES.BR,
    TAG_NAMES.COL,
    TAG_NAMES.EMBED,
    TAG_NAMES.FRAME,
    TAG_NAMES.HR,
    TAG_NAMES.IMG,
    TAG_NAMES.INPUT,
    TAG_NAMES.KEYGEN,
    TAG_NAMES.LINK,
    TAG_NAMES.META,
    TAG_NAMES.PARAM,
    TAG_NAMES.SOURCE,
    TAG_NAMES.TRACK,
    TAG_NAMES.WBR,
]);
function isVoidElement(node, options) {
    return (options.treeAdapter.isElementNode(node) &&
        options.treeAdapter.getNamespaceURI(node) === NS.HTML &&
        VOID_ELEMENTS.has(options.treeAdapter.getTagName(node)));
}
const defaultOpts = { treeAdapter: defaultTreeAdapter, scriptingEnabled: true };
/**
 * Serializes an AST element node to an HTML string, including the element node.
 *
 * @example
 *
 * ```js
 * const parse5 = require('parse5');
 *
 * const document = parse5.parseFragment('<div>Hello, <b>world</b>!</div>');
 *
 * // Serializes the <div> element.
 * const str = parse5.serializeOuter(document.childNodes[0]);
 *
 * console.log(str); //> '<div>Hello, <b>world</b>!</div>'
 * ```
 *
 * @param node Node to serialize.
 * @param options Serialization options.
 */
function serializeOuter(node, options) {
    const opts = { ...defaultOpts, ...options };
    return serializeNode(node, opts);
}
function serializeChildNodes(parentNode, options) {
    let html = '';
    // Get container of the child nodes
    const container = options.treeAdapter.isElementNode(parentNode) &&
        options.treeAdapter.getTagName(parentNode) === TAG_NAMES.TEMPLATE &&
        options.treeAdapter.getNamespaceURI(parentNode) === NS.HTML
        ? options.treeAdapter.getTemplateContent(parentNode)
        : parentNode;
    const childNodes = options.treeAdapter.getChildNodes(container);
    if (childNodes) {
        for (const currentNode of childNodes) {
            html += serializeNode(currentNode, options);
        }
    }
    return html;
}
function serializeNode(node, options) {
    if (options.treeAdapter.isElementNode(node)) {
        return serializeElement(node, options);
    }
    if (options.treeAdapter.isTextNode(node)) {
        return serializeTextNode(node, options);
    }
    if (options.treeAdapter.isCommentNode(node)) {
        return serializeCommentNode(node, options);
    }
    if (options.treeAdapter.isDocumentTypeNode(node)) {
        return serializeDocumentTypeNode(node, options);
    }
    // Return an empty string for unknown nodes
    return '';
}
function serializeElement(node, options) {
    const tn = options.treeAdapter.getTagName(node);
    return `<${tn}${serializeAttributes(node, options)}>${isVoidElement(node, options) ? '' : `${serializeChildNodes(node, options)}</${tn}>`}`;
}
function serializeAttributes(node, { treeAdapter }) {
    let html = '';
    for (const attr of treeAdapter.getAttrList(node)) {
        html += ' ';
        if (attr.namespace) {
            switch (attr.namespace) {
                case NS.XML: {
                    html += `xml:${attr.name}`;
                    break;
                }
                case NS.XMLNS: {
                    if (attr.name !== 'xmlns') {
                        html += 'xmlns:';
                    }
                    html += attr.name;
                    break;
                }
                case NS.XLINK: {
                    html += `xlink:${attr.name}`;
                    break;
                }
                default: {
                    html += `${attr.prefix}:${attr.name}`;
                }
            }
        }
        else {
            html += attr.name;
        }
        html += `="${escapeAttribute(attr.value)}"`;
    }
    return html;
}
function serializeTextNode(node, options) {
    const { treeAdapter } = options;
    const content = treeAdapter.getTextNodeContent(node);
    const parent = treeAdapter.getParentNode(node);
    const parentTn = parent && treeAdapter.isElementNode(parent) && treeAdapter.getTagName(parent);
    return parentTn &&
        treeAdapter.getNamespaceURI(parent) === NS.HTML &&
        hasUnescapedText(parentTn, options.scriptingEnabled)
        ? content
        : escapeText(content);
}
function serializeCommentNode(node, { treeAdapter }) {
    return `<!--${treeAdapter.getCommentNodeContent(node)}-->`;
}
function serializeDocumentTypeNode(node, { treeAdapter }) {
    return `<!DOCTYPE ${treeAdapter.getDocumentTypeNodeName(node)}>`;
}

// Shorthands
/**
 * Parses an HTML string.
 *
 * @param html Input HTML string.
 * @param options Parsing options.
 * @returns Document
 *
 * @example
 *
 * ```js
 * const parse5 = require('parse5');
 *
 * const document = parse5.parse('<!DOCTYPE html><html><head></head><body>Hi there!</body></html>');
 *
 * console.log(document.childNodes[1].tagName); //> 'html'
 *```
 */
function parse$1(html, options) {
    return Parser.parse(html, options);
}
function parseFragment(fragmentContext, html, options) {
    if (typeof fragmentContext === 'string') {
        options = html;
        html = fragmentContext;
        fragmentContext = null;
    }
    const parser = Parser.getFragmentParser(fragmentContext, options);
    parser.tokenizer.write(html, true);
    return parser.getFragment();
}

function enquoteDoctypeId(id) {
    const quote = id.includes('"') ? "'" : '"';
    return quote + id + quote;
}
/** @internal */
function serializeDoctypeContent(name, publicId, systemId) {
    let str = '!DOCTYPE ';
    if (name) {
        str += name;
    }
    if (publicId) {
        str += ` PUBLIC ${enquoteDoctypeId(publicId)}`;
    }
    else if (systemId) {
        str += ' SYSTEM';
    }
    if (systemId) {
        str += ` ${enquoteDoctypeId(systemId)}`;
    }
    return str;
}
const adapter = {
    // Re-exports from domhandler
    isCommentNode: isComment,
    isElementNode: isTag,
    isTextNode: isText,
    //Node construction
    createDocument() {
        const node = new Document([]);
        node['x-mode'] = DOCUMENT_MODE.NO_QUIRKS;
        return node;
    },
    createDocumentFragment() {
        return new Document([]);
    },
    createElement(tagName, namespaceURI, attrs) {
        const attribs = Object.create(null);
        const attribsNamespace = Object.create(null);
        const attribsPrefix = Object.create(null);
        for (let i = 0; i < attrs.length; i++) {
            const attrName = attrs[i].name;
            attribs[attrName] = attrs[i].value;
            attribsNamespace[attrName] = attrs[i].namespace;
            attribsPrefix[attrName] = attrs[i].prefix;
        }
        const node = new Element(tagName, attribs, []);
        node.namespace = namespaceURI;
        node['x-attribsNamespace'] = attribsNamespace;
        node['x-attribsPrefix'] = attribsPrefix;
        return node;
    },
    createCommentNode(data) {
        return new Comment(data);
    },
    createTextNode(value) {
        return new Text(value);
    },
    //Tree mutation
    appendChild(parentNode, newNode) {
        const prev = parentNode.children[parentNode.children.length - 1];
        if (prev) {
            prev.next = newNode;
            newNode.prev = prev;
        }
        parentNode.children.push(newNode);
        newNode.parent = parentNode;
    },
    insertBefore(parentNode, newNode, referenceNode) {
        const insertionIdx = parentNode.children.indexOf(referenceNode);
        const { prev } = referenceNode;
        if (prev) {
            prev.next = newNode;
            newNode.prev = prev;
        }
        referenceNode.prev = newNode;
        newNode.next = referenceNode;
        parentNode.children.splice(insertionIdx, 0, newNode);
        newNode.parent = parentNode;
    },
    setTemplateContent(templateElement, contentElement) {
        adapter.appendChild(templateElement, contentElement);
    },
    getTemplateContent(templateElement) {
        return templateElement.children[0];
    },
    setDocumentType(document, name, publicId, systemId) {
        const data = serializeDoctypeContent(name, publicId, systemId);
        let doctypeNode = document.children.find((node) => isDirective(node) && node.name === '!doctype');
        if (doctypeNode) {
            doctypeNode.data = data !== null && data !== void 0 ? data : null;
        }
        else {
            doctypeNode = new ProcessingInstruction('!doctype', data);
            adapter.appendChild(document, doctypeNode);
        }
        doctypeNode['x-name'] = name;
        doctypeNode['x-publicId'] = publicId;
        doctypeNode['x-systemId'] = systemId;
    },
    setDocumentMode(document, mode) {
        document['x-mode'] = mode;
    },
    getDocumentMode(document) {
        return document['x-mode'];
    },
    detachNode(node) {
        if (node.parent) {
            const idx = node.parent.children.indexOf(node);
            const { prev, next } = node;
            node.prev = null;
            node.next = null;
            if (prev) {
                prev.next = next;
            }
            if (next) {
                next.prev = prev;
            }
            node.parent.children.splice(idx, 1);
            node.parent = null;
        }
    },
    insertText(parentNode, text) {
        const lastChild = parentNode.children[parentNode.children.length - 1];
        if (lastChild && isText(lastChild)) {
            lastChild.data += text;
        }
        else {
            adapter.appendChild(parentNode, adapter.createTextNode(text));
        }
    },
    insertTextBefore(parentNode, text, referenceNode) {
        const prevNode = parentNode.children[parentNode.children.indexOf(referenceNode) - 1];
        if (prevNode && isText(prevNode)) {
            prevNode.data += text;
        }
        else {
            adapter.insertBefore(parentNode, adapter.createTextNode(text), referenceNode);
        }
    },
    adoptAttributes(recipient, attrs) {
        for (let i = 0; i < attrs.length; i++) {
            const attrName = attrs[i].name;
            if (recipient.attribs[attrName] === undefined) {
                recipient.attribs[attrName] = attrs[i].value;
                recipient['x-attribsNamespace'][attrName] = attrs[i].namespace;
                recipient['x-attribsPrefix'][attrName] = attrs[i].prefix;
            }
        }
    },
    //Tree traversing
    getFirstChild(node) {
        return node.children[0];
    },
    getChildNodes(node) {
        return node.children;
    },
    getParentNode(node) {
        return node.parent;
    },
    getAttrList(element) {
        return element.attributes;
    },
    //Node data
    getTagName(element) {
        return element.name;
    },
    getNamespaceURI(element) {
        return element.namespace;
    },
    getTextNodeContent(textNode) {
        return textNode.data;
    },
    getCommentNodeContent(commentNode) {
        return commentNode.data;
    },
    getDocumentTypeNodeName(doctypeNode) {
        var _a;
        return (_a = doctypeNode['x-name']) !== null && _a !== void 0 ? _a : '';
    },
    getDocumentTypeNodePublicId(doctypeNode) {
        var _a;
        return (_a = doctypeNode['x-publicId']) !== null && _a !== void 0 ? _a : '';
    },
    getDocumentTypeNodeSystemId(doctypeNode) {
        var _a;
        return (_a = doctypeNode['x-systemId']) !== null && _a !== void 0 ? _a : '';
    },
    //Node types
    isDocumentTypeNode(node) {
        return isDirective(node) && node.name === '!doctype';
    },
    // Source code location
    setNodeSourceCodeLocation(node, location) {
        if (location) {
            node.startIndex = location.startOffset;
            node.endIndex = location.endOffset;
        }
        node.sourceCodeLocation = location;
    },
    getNodeSourceCodeLocation(node) {
        return node.sourceCodeLocation;
    },
    updateNodeSourceCodeLocation(node, endLocation) {
        if (endLocation.endOffset != null)
            node.endIndex = endLocation.endOffset;
        node.sourceCodeLocation = {
            ...node.sourceCodeLocation,
            ...endLocation,
        };
    },
};

/**
 * Parse the content with `parse5` in the context of the given `ParentNode`.
 *
 * @param content - The content to parse.
 * @param options - A set of options to use to parse.
 * @param isDocument - Whether to parse the content as a full HTML document.
 * @param context - The context in which to parse the content.
 * @returns The parsed content.
 */
function parseWithParse5(content, options, isDocument, context) {
    var _a;
    (_a = options.treeAdapter) !== null && _a !== void 0 ? _a : (options.treeAdapter = adapter);
    if (options.scriptingEnabled !== false) {
        options.scriptingEnabled = true;
    }
    return isDocument
        ? parse$1(content, options)
        : parseFragment(context, content, options);
}
const renderOpts = { treeAdapter: adapter };
/**
 * Renders the given DOM tree with `parse5` and returns the result as a string.
 *
 * @param dom - The DOM tree to render.
 * @returns The rendered document.
 */
function renderWithParse5(dom) {
    /*
     * `dom-serializer` passes over the special "root" node and renders the
     * node's children in its place. To mimic this behavior with `parse5`, an
     * equivalent operation must be applied to the input array.
     */
    const nodes = 'length' in dom ? dom : [dom];
    for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];
        if (isDocument(node)) {
            Array.prototype.splice.call(nodes, index, 1, ...node.children);
        }
    }
    let result = '';
    for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];
        result += serializeOuter(node, renderOpts);
    }
    return result;
}

const parse = getParse((content, options, isDocument, context) => options._useHtmlParser2
    ? parseDocument(content, options)
    : parseWithParse5(content, options, isDocument, context));
// Duplicate docs due to https://github.com/TypeStrong/typedoc/issues/1616
/**
 * Create a querying function, bound to a document created from the provided
 * markup.
 *
 * Note that similar to web browser contexts, this operation may introduce
 * `<html>`, `<head>`, and `<body>` elements; set `isDocument` to `false` to
 * switch to fragment mode and disable this.
 *
 * @category Loading
 * @param content - Markup to be loaded.
 * @param options - Options for the created instance.
 * @param isDocument - Allows parser to be switched to fragment mode.
 * @returns The loaded document.
 * @see {@link https://cheerio.js.org/docs/basics/loading#load} for additional usage information.
 */
const load = getLoad(parse, (dom, options) => options._useHtmlParser2
    ? render$1(dom, options)
    : renderWithParse5(dom));

const AUTHOR = "Hares";
const VERSION = "1.0.6";
const NONE_EXIST_ERROR = "The corresponding resource does not exist.";
const DEFAULT_TIMEOUT = 15000;
const ANTI_BOT_PATTERNS = /验证码|检测到有异常请求|机器人程序|访问受限|请先登录/i;
const NOT_FOUND_PATTERN = /你想访问的页面不存在/;
const ANTI_BOT_ERROR = 'Douban blocked request (captcha/anti-bot). Provide valid cookie or try later.';
const ROOT_PAGE_CONFIG = {
  HTML_TEMPLATE: `
<!DOCTYPE html>
<html>
<head>
    <title>PT-Gen - Generate PT Descriptions</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f4f4f4; padding: 12px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>PT-Gen API Service</h1>
        <p>这是一个媒体信息生成服务，支持从豆瓣、IMDb、TMDB、Bangumi等平台获取媒体信息。</p>
        <h2>更多信息</h2>
        <p>请访问<a href="https://github.com/rabbitwit/PT-Gen-Refactor" target="_blank" rel="noopener noreferrer">PT-Gen-Refactor</a>项目文档了解详细使用方法。</p>
        <p>__COPYRIGHT__</p>
    </div>
</body>
</html>`,

  API_DOC: {
    "API Status": "PT-Gen API Service is running",
    "Endpoints": {
      "/": "API documentation (this page)",
      "/?source=[douban|imdb|tmdb|bgm|melon]&query=[name]": "Search for media by name",
      "/?url=[media_url]": "Generate media description by URL"
    },
    "Notes": "Please use the appropriate source and query parameters for search, or provide a direct URL for generation."
  }
};

const DOUBAN_REQUEST_HEADERS_BASE = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Cache-control": "max-age=0",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "sec-ch-ua":
    '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
};

const JSONP_REGEX = /^[^(]+\(\s*([\s\S]+?)\s*\);?$/i;
const DEFAULT_BODY_TEMPLATE = Object.freeze({ // 默认响应体模板（不可变）
  success: false,
  error: null,
  format: '',
  version: VERSION,
  generate_at: 0
});

const isAntiBot = (text) => text && ANTI_BOT_PATTERNS.test(text);

/**
 * 构建请求头对象
 * @param {Object} env - 环境变量对象
 * @param {string} env.DOUBAN_COOKIE - 豆瓣Cookie值
 * @returns {Object} 包含基础请求头和可选Cookie的请求头对象
 */
const buildHeaders$1 = (env = {}) => ({
  ...DOUBAN_REQUEST_HEADERS_BASE,
  ...(env?.DOUBAN_COOKIE && { Cookie: env.DOUBAN_COOKIE }),
});

/**
 * 带超时控制的fetch请求函数
 * @param {string} url - 请求地址
 * @param {Object} opts - fetch选项配置
 * @param {number} timeout - 超时时间（毫秒），默认为DEFAULT_TIMEOUT
 * @returns {Promise<Response>} 返回fetch响应结果
 */
const fetchWithTimeout = async (url, opts = {}, timeout = DEFAULT_TIMEOUT) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
};

/**
 * 解析HTML页面为 cheerio 实例
 * 支持 string 或 Buffer 输入
 * @param {string|Buffer} responseText
 * @returns {cheerio}
 */
const page_parser$1 = (responseText) => {
  try {
    if (typeof responseText !== 'string') {
      if (typeof globalThis !== 'undefined' && globalThis.Buffer && globalThis.Buffer.isBuffer(responseText)) {
        responseText = responseText.toString('utf8');
      } else if (responseText instanceof ArrayBuffer) {
        responseText = new TextDecoder('utf-8').decode(new Uint8Array(responseText));
      } else if (ArrayBuffer.isView(responseText)) {
        const view = new Uint8Array(responseText.buffer, responseText.byteOffset, responseText.byteLength);
        responseText = new TextDecoder('utf-8').decode(view);
      } else {
        responseText = String(responseText || '');
      }
    }
  } catch (e) {
    responseText = String(responseText || '');
  }

  return load(responseText, { decodeEntities: false });
};

/**
 * 解析 JSONP 返回值，返回对象或空对象（解析失败时）
 * @param {string} responseText
 * @returns {Object}
 */
const jsonp_parser = (responseText) => {
  try {
    if (typeof responseText !== 'string') responseText = String(responseText || '');
    const m = responseText.replace(/\r?\n/g, '').match(JSONP_REGEX);
    if (!m || !m[1]) {
      console.error('JSONP解析失败：未匹配到有效的 JSON 内容');
      return {};
    }
    return JSON.parse(m[1]);
  } catch (e) {
    console.error('JSONP解析错误:', e);
    return {};
  }
};

/**
 * 返回 JSON Response
 * @param {Object} body
 * @param {Object} initOverride - 可包含 status 和 headers 字段，用于覆盖默认值
 * @returns {Response}
 */
const makeJsonRawResponse = (body, initOverride) => {
  const defaultHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  const init = {
    status: 200,
    headers: {
      ...defaultHeaders,
      ...(initOverride && initOverride.headers ? initOverride.headers : {})
    },
    ...(initOverride || {})
  };

  init.status = typeof init.status === 'number' ? init.status : 200;

  const payload = JSON.stringify(body || {}, null, 2);
  return new Response(payload, init);
};

/**
 * 合并默认字段并返回 Response
 * @param {Object} body_update
 * @param {Object} env - 环境变量对象，用于获取AUTHOR等配置
 * @param {number} status - HTTP状态码，默认为200
 * @returns {Response}
 */
const makeJsonResponse = (body_update, env, status = 200) => {
  const body = {
    ...DEFAULT_BODY_TEMPLATE,
    copyright: `Powered by @${env?.AUTHOR || AUTHOR}`,
    generate_at: Date.now(),
    ...(body_update || {})
  };
  return makeJsonRawResponse(body, { status });
};

const MAX_WIDTH = 150;
const isValidArray = (arr) => Array.isArray(arr) && arr.length > 0;

/**
 * 处理Bangumi导演脚本信息字段，将其格式化为带标签的文本行
 * @param {Array|string} personData - 人员数据，可以是数组或字符串格式
 * @param {string} label - 显示标签
 * @returns {string|null} 格式化后的文本行，如果内容为空则返回null
 */
const processPersonField = (personData, label) => {
  let content = "";
  if (Array.isArray(personData)) {
    content = personData.join(" / ").trim();
  } else if (typeof personData === "string") {
    content = personData
      .split(/[、\/,]/)
      .map((p) => p.trim())
      .filter(Boolean)
      .join(" / ");
  }
  return content
    ? formatWrappedLine({ label, content, maxWidth: MAX_WIDTH })
    : null;
};

/**
 * 将文本以固定缩进进行自动换行
 * @param {string} text - 需要换行的原始文本
 * @param {number} maxWidth - 每行的最大视觉宽度
 * @param {string} indentString - 应用于每一行开头的缩进字符串
 * @returns {string} - 格式化后、包含换行符的完整字符串
 */
const wrapTextWithIndent = (text, maxWidth, indentString) => {
  const indentWidth = getStringVisualLength(indentString);
  const contentWidth = maxWidth - indentWidth;

  // 如果可用内容宽度小于等于0，无法换行，直接返回缩进+文本
  if (contentWidth <= 0) {
    return indentString + text;
  }

  let lines = [];
  let currentLine = "";
  let currentLineWidth = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charWidth = getStringVisualLength(char);

    // 如果当前字符加上后会超长
    if (currentLineWidth + charWidth > contentWidth) {
      lines.push(indentString + currentLine);
      currentLine = char; // 新的一行以这个字符开始
      currentLineWidth = charWidth;
    } else {
      // 否则，将字符添加到当前行
      currentLine += char;
      currentLineWidth += charWidth;
    }
  }

  if (currentLine) {
    lines.push(indentString + currentLine);
  }

  return lines.join("\n");
};

/**
 * 计算字符串的视觉长度，其中中文字符和全角字符计为2个单位长度，英文字符和半角字符计为1个单位长度
 * @param {string} str - 需要计算长度的字符串
 * @returns {number} 字符串的视觉长度
 */
function getStringVisualLength(str) {
  let length = 0;
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    // 判断字符是否为宽字符（CJK字符、全角字符等）
    if (
      // CJK字符范围
      (charCode >= 0x4e00 && charCode <= 0x9fff) ||
      // 全角ASCII和片假名
      (charCode >= 0xff00 && charCode <= 0xffef) ||
      // CJK符号和标点
      (charCode >= 0x3000 && charCode <= 0x303f) ||
      // 全角形式
      (charCode >= 0xfe30 && charCode <= 0xfe6f)
    ) {
      length += 2;
    } else {
      length += 1;
    }
  }
  return length;
}

/**
 * 将带标签的行格式化为自动换行并对齐的字符串
 * @param {object} options
 * @param {string} options.label - 标签文本，例如 "❁ 标签:"
 * @param {string} options.content - 内容文本
 * @param {number} options.maxWidth - 每行的最大视觉宽度
 * @param {string} [options.separator=' / '] - 内容项之间的分隔符
 * @returns {string} - 格式化后的完整字符串 (可能包含多行)
 */
function formatWrappedLine({ label, content, maxWidth, separator = " / " }) {
  if (!content || content.trim() === "") {
    return label;
  }
  const items = content.split(separator);
  const labelVisualWidth = getStringVisualLength(label);
  const indentString = " ".repeat(labelVisualWidth);
  let lines = [];
  let currentLine = label;

  items.forEach((item, index) => {
    const itemVisualWidth = getStringVisualLength(item);
    const separatorVisualWidth = getStringVisualLength(separator);
    const currentLineVisualWidth = getStringVisualLength(currentLine);

    if (
      index > 0 &&
      currentLineVisualWidth + separatorVisualWidth + itemVisualWidth > maxWidth
    ) {
      // 保留分隔符在前一行
      lines.push(currentLine.trimEnd() + separator);
      currentLine = indentString + item;
    } else {
      // 第一项直接添加，后续项添加分隔符后再添加内容
      if (index === 0) {
        currentLine += item;
      } else {
        currentLine += separator + item;
      }
    }
  });

  lines.push(currentLine);
  return lines.join("\n");
}

/**
 * 处理需求文本，将其格式化为带标题的结构化文本。
 * 主要功能包括清洗HTML、按行处理、识别并过滤特定标签（如配置要求）、
 * 并将剩余内容进行换行包装后输出。
 *
 * @param {string} reqText - 需要处理的原始需求文本，可能包含HTML标签
 * @param {string} title - 显示在结果最前面的标题内容
 * @returns {string} 格式化后的字符串，以标题开头，随后是处理过的内容，
 *                   每个段落之间用空行分隔；如果输入无效或无有效内容则返回空字符串
 */
const processRequirements = (reqText, title) => {
  // 类型保护
  if (typeof reqText !== "string") return "";
  if (!reqText) return "";

  const cleaned = cleanHtml(reqText);
  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => Boolean(line));

  if (lines.length === 0) return "";

  const result = [];
  result.push(`❁ ${title}`);
  let buffer = [];

  // 扩展标签集合，包含中英文的最低配置与推荐配置关键词
  const labelSet = new Set([
    "minimum:",
    "recommended:",
    "minimum",
    "recommended",
    "最低配置:",
    "推荐配置:",
    "最低配置",
    "推荐配置",
  ]);

  /**
   * 将缓冲区中的多行文本逐行进行换行包装，并加入到最终结果数组中
   * @param {string[]} bufLines - 要处理的文本行数组
   * @param {string} indent - 换行时使用的缩进，默认为四个空格
   * @param {number} max - 每行最大字符数限制，默认为80
   */
  const appendWrapped = (bufLines, indent = "    ", max = 80) => {
    for (let i = 0; i < bufLines.length; i++) {
      const line = bufLines[i];
      const wrapped = wrapLines(line, indent, max);
      if (Array.isArray(wrapped)) {
        result.push(...wrapped);
      } else {
        result.push(wrapped);
      }
    }
  };

  for (const rawLine of lines) {
    if (!rawLine) continue;
    const line = rawLine.trim();
    const lower = line.toLowerCase();

    if (labelSet.has(lower) || labelSet.has(line)) {
      if (buffer.length > 0) {
        appendWrapped(buffer);
        buffer = [];
      }
      continue;
    }

    // 过滤掉附注事项相关的内容
    if (/^(additional notes|附注事项|备注)[:：]?\s*/i.test(line)) {
      if (buffer.length > 0) {
        appendWrapped(buffer);
        buffer = [];
      }
      continue;
    }

    buffer.push(line);
  }

  if (buffer.length > 0) {
    appendWrapped(buffer);
  }

  result.push("");
  return result.join("\n");
};

/**
 * 清理HTML字符串，将其转换为纯文本
 * @param {string} html - 需要清理的HTML字符串
 * @returns {string} 清理后的纯文本字符串
 */
const cleanHtml = (html) => {
  if (!html) return "";
  let s = String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<\/?(?:strong|ul|li)[^>]*>/gi, "")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/\r\n/g, "\n")
    .trim();
  return s;
};

/**
 * 将文本按指定宽度自动换行，并添加缩进
 * @param {string} text - 需要处理的文本内容
 * @param {string} [indent='  '] - 每行的缩进字符串，默认为两个空格
 * @param {number} [max=80] - 每行最大字符数，默认为80
 * @returns {string} 处理后的文本，包含适当的换行和缩进
 */
const wrapLines = (text, indent = "  ", max = 80) => {
  if (!text) return "";
  if (max <= 0) max = 80;
  if (indent.length >= max) indent = "  ";

  const words = String(text).split(/\s+/);
  let currentLine = indent;
  const lines = [];

  for (const word of words) {
    // 如果单个单词就超过行宽限制，强制放在新行
    if (word.length >= max - indent.length) {
      if (currentLine !== indent) {
        lines.push(currentLine);
      }
      lines.push(indent + word);
      currentLine = indent;
      continue;
    }

    // 检查是否需要换行
    const separator = currentLine === indent ? "" : " ";
    if (currentLine.length + separator.length + word.length > max) {
      lines.push(currentLine);
      currentLine = indent + word;
    } else {
      currentLine += separator + word;
    }
  }

  if (currentLine !== indent) {
    lines.push(currentLine);
  }

  return lines.join("\n");
};

/**
 * 根据豆瓣数据生成格式化文本
 * @param {Object} data - 豆瓣电影/电视剧数据对象
 * @returns {string} 格式化后的文本内容
 */
const generateDoubanFormat = (data) => {
  const lines = [];
  if (data.poster) lines.push(`[img]${data.poster}[/img]\n`);
  if (data.foreign_title) {
    lines.push(`❁ 片　　名:　${data.foreign_title}`);
  } else if (data.chinese_title) {
    lines.push(`❁ 片　　名:　${data.chinese_title}`);
  }
  if (data.aka && data.aka.length)
    lines.push(`❁ 译　　名:　${data.aka.join(" / ").trim()}`);
  if (data.year) lines.push(`❁ 年　　代:　${data.year}`);
  if (data.region && data.region.length)
    lines.push(`❁ 产　　地:　${data.region.join(" / ")}`);
  if (data.genre && data.genre.length)
    lines.push(`❁ 类　　别:　${data.genre.join(" / ")}`);
  if (data.language && data.language.length)
    lines.push(`❁ 语　　言:　${data.language.join(" / ")}`);
  if (data.playdate && data.playdate.length)
    lines.push(`❁ 上映日期:　${data.playdate.join(" / ")}`);
  if (data.imdb_rating) lines.push(`❁ IMDb评分:　${data.imdb_rating}`);
  if (data.imdb_link) lines.push(`❁ IMDb链接:　${data.imdb_link}`);
  lines.push(`❁ 豆瓣评分:　${data.douban_rating}`);
  lines.push(`❁ 豆瓣链接:　${data.douban_link}`);
  if (data.episodes) lines.push(`❁ 集　　数:　${data.episodes}`);
  if (data.duration) lines.push(`❁ 片　　长:　${data.duration}`);
  if (data.director && data.director.length)
    lines.push(`❁ 导　　演:　${data.director.map((x) => x.name).join(" / ")}`);
  if (data.writer && data.writer.length) {
    const content = data.writer
      .map((x) => x.name)
      .join(" / ")
      .trim();
    lines.push(`❁ 编　　剧:　${content}`);
  }

  if (data.cast && data.cast.length) {
    const castNames = data.cast.map((x) => x.name).filter(Boolean);
    if (castNames.length) {
      lines.push(
        formatWrappedLine({
          label: "❁ 主　　演:　",
          content: castNames.join("\n　　　　　　　").trim(),
          maxWidth: 100,
        })
      );
    }
  }

  if (data.tags && data.tags.length)
    lines.push(`\n❁ 标　　签:　${data.tags.join(" | ")}`);
  if (data.introduction) {
    lines.push(`\n❁ 简　　介\n`);
    lines.push(`　${data.introduction.replace(/\n/g, "\n　　")}`);
  }

  if (data.awards && Array.isArray(data.awards) && data.awards.length) {
    lines.push(`\n❁ 获奖情况\n`);
    const awardsLines = data.awards
      .map((awardBlock, index) => {
        if (typeof awardBlock === "string") {
          return `　　${awardBlock}`;
        } else if (
          awardBlock &&
          awardBlock.festival &&
          Array.isArray(awardBlock.awards)
        ) {
          const festivalLine = `${index === 0 ? "" : "\n"}${
            awardBlock.festival
          }`;
          const awardsLines = awardBlock.awards.map((award) => `　　${award}`);
          return [festivalLine, ...awardsLines].join("\n");
        }
        return "";
      })
      .filter((line) => line !== "");

    lines.push(awardsLines.join("\n"));
  }

  return lines.join("\n").trim();
};

/**
 * 根据IMDb数据生成格式化文本
 * @param {Object} data - IMDb电影/电视剧数据对象
 * @returns {string} 格式化后的文本内容
 */
const generateImdbFormat = (data) => {
  const lines = [];
  const releaseInfo = [];
  lines.push(`[img]${data.image ?? data.poster}[/img]\n`);
  if (data.original_title) {
    lines.push(`❁ Original Title:　${data.original_title}`);
  } else if (data.name) {
    lines.push(`❁ Original Title:　${data.name}`);
  }

  lines.push(`❁ Type:　${data.type}`);
  lines.push(`❁ Year:　${data.year}`);
  if (data.origin_country) {
    lines.push(`❁ Origin Country:　${data.origin_country.join(" / ")}`);
  }
  if (data.language) {
    lines.push(
      formatWrappedLine({
        label: "❁ Languages:　",
        content: data.languages.join(" / "),
        maxWidth: MAX_WIDTH,
      })
    );
  }

  lines.push(
    formatWrappedLine({
      label: "❁ Genres:　",
      content: data.genres.join(" / "),
      maxWidth: MAX_WIDTH,
    })
  );

  if (data.episodes && data.episodes > 0) {
    lines.push(`❁ Episodes:　${data.episodes}`);
    if (data.seasons && data.seasons.length > 0) {
      lines.push(`❁ Seasons:　${data.seasons.join(" | ").trim()}`);
    }
  }

  lines.push(`❁ Runtime:　${data.runtime}`);
  lines.push(
    `❁ IMDb Rating:　${data.rating} / 10 from ${data.vote_count} users`
  );
  lines.push(`❁ IMDb Link:　${data.link}`);
  if (data.release_date) {
    const formattedDate = `${data.release_date.year}-${String(
      data.release_date.month
    ).padStart(2, "0")}-${String(data.release_date.day).padStart(2, "0")}`;
    const country = data.release_date.country || "";
    const dateWithCountry = country
      ? `${formattedDate} (${country})`
      : formattedDate;
    releaseInfo.push(dateWithCountry);
  }

  if (data.release && data.release.length) {
    data.release.forEach((item) => {
      if (item.date) {
        let formattedDate = item.date;
        const dateMatch = item.date.match(/([A-Za-z]+)\s+(\d+),\s+(\d{4})/);
        if (dateMatch) {
          const [, monthStr, day, year] = dateMatch;
          const months = {
            January: "01",
            February: "02",
            March: "03",
            April: "04",
            May: "05",
            June: "06",
            July: "07",
            August: "08",
            September: "09",
            October: "10",
            November: "11",
            December: "12",
          };
          const month = months[monthStr] || "01";
          formattedDate = `${year}-${month}-${day.padStart(2, "0")}`;
        }
        const country = item.country || "Unknown";
        const releaseText = `${formattedDate} (${country})`;
        releaseInfo.push(releaseText);
      }
    });
  }

  if (releaseInfo.length > 0) {
    lines.push(`❁ Release Date:　${releaseInfo.join(" / ").trim()}`);
  }

  if (data.aka && data.aka.length) {
    // 构造包含国家信息的 AKA 字符串，格式为 "标题 (国家)"
    const akaWithCountries = data.aka
      .map((item) => {
        if (typeof item === "string") return item;
        const title = item.title || "";
        const country = item.country || "";
        // 如果有国家信息，则添加括号标注
        return country ? `${title} (${country})` : title;
      })
      .filter(Boolean);

    if (akaWithCountries.length > 0) {
      lines.push(
        formatWrappedLine({
          label: "❁ Also Known As:　",
          content: akaWithCountries.join(" / ").trim(),
          maxWidth: MAX_WIDTH,
        })
      );
    }
  }

  if (data.keywords) {
    lines.push(
      formatWrappedLine({
        label: "❁ Keywords:　",
        content: data.keywords.join(" | ").trim(),
        maxWidth: MAX_WIDTH,
      })
    );
  }

  if (data.directors && data.directors.length) {
    const directors = Array.isArray(data.directors)
      ? data.directors
      : [data.directors];
    lines.push(
      `❁ Directors:　${directors
        .map((i) => i.name || i)
        .join(" / ")
        .trim()}`
    );
  }

  if (data.writers && data.writers.length) {
    const writers = Array.isArray(data.writers) ? data.writers : [data.writers];
    lines.push(
      `❁ Writers:　${writers
        .map((i) => i.name || i)
        .join(" / ")
        .trim()}`
    );
  }
  if (data.cast && data.cast.length) {
    lines.push(
      formatWrappedLine({
        label: "❁ Actors:　",
        content: data.cast
          .map((i) => {
            if (typeof i === "string") return i;
            return i.name || "Unknown";
          })
          .join(" / ")
          .trim(),
        maxWidth: 145,
      })
    );
  }

  if (data.plot) {
    lines.push(`
❁ Plot　
　　${data.plot.replace(/\n/g, "\n　　")}`);
  }

  return lines.join("\n").trim();
};

/**
 * 根据TMDB数据生成格式化文本
 * @param {Object} data - TMDB电影/电视剧数据对象
 * @returns {string} 格式化后的文本内容
 */
const generateTmdbFormat = (data) => {
  const lines = [];
  if (data.poster) lines.push(`[img]${data.poster}[/img]`, "");
  lines.push(`❁ Title:　${data.title || "N/A"}`);
  lines.push(`❁ Original Title:　${data.original_title || "N/A"}`);
  lines.push(
    `❁ Genres:　${
      data.genres && data.genres.length ? data.genres.join(" / ") : "N/A"
    }`
  );
  lines.push(
    `❁ Languages:　${
      data.languages && data.languages.length
        ? data.languages.join(" / ")
        : "N/A"
    }`
  );

  const isMovie =
    (data.release_date && !data.first_air_date) ||
    (data.tmdb_id &&
      typeof data.tmdb_id === "string" &&
      data.tmdb_id.includes("movie"));

  if (isMovie) {
    lines.push(`❁ Release Date:　${data.release_date || "N/A"}`);
    lines.push(`❁ Runtime:　${data.runtime || "N/A"}`);
  } else {
    lines.push(`❁ First Air Date:　${data.first_air_date || "N/A"}`);
    lines.push(`❁ Number of Episodes:　${data.number_of_episodes || "N/A"}`);
    lines.push(`❁ Number of Seasons:　${data.number_of_seasons || "N/A"}`);
    lines.push(`❁ Episode Runtime:　${data.episode_run_time || "N/A"}`);
  }

  lines.push(
    `❁ Production Countries:　${
      data.countries && data.countries.length
        ? data.countries.join(" / ")
        : "N/A"
    }`
  );
  lines.push(`❁ Rating:　${data.tmdb_rating || "N/A"}`);

  if (data.tmdb_id) {
    const mediaType = isMovie ? "movie" : "tv";
    const tmdbLink = `https://www.themoviedb.org/${mediaType}/${data.tmdb_id}/`;
    lines.push(`❁ TMDB Link:　${tmdbLink}`);
  }

  if (data.imdb_link) lines.push(`❁ IMDb Link:　${data.imdb_link}`);

  if (data.directors && data.directors.length) {
    const directorNames = data.directors
      .filter((d) => d && d.name)
      .map((d) => d.name)
      .join(" / ");
    if (directorNames) lines.push(`❁ Directors:　${directorNames}`);
  }

  if (data.producers && data.producers.length) {
    const producerNames = data.producers
      .filter((p) => p && p.name)
      .map((p) => p.name)
      .join(" / ");
    if (producerNames) lines.push(`❁ Producers:　${producerNames}`);
  }

  if (data.cast && data.cast.length) {
    lines.push("", "❁ Cast");
    const castLines = data.cast
      .filter((a) => a && a.name)
      .map((a) => `  ${a.name}${a.character ? " as " + a.character : ""}`)
      .slice(0, 15); // 限制显示数量
    lines.push(...castLines);
  }

  if (data.overview) {
    lines.push(
      "",
      "❁ Introduction",
      `　　${data.overview.replace(/\n/g, "\n  ")}`
    );
  }

  return lines.join("\n").trim();
};

/**
 * 根据Melon数据生成格式化文本
 * @param {Object} data - Melon专辑数据对象
 * @returns {string} 格式化后的文本内容
 */
const generateMelonFormat = (data) => {
  const lines = [];
  if (data.poster) lines.push(`[img]${data.poster}[/img]\n`);
  lines.push(`❁ 专辑名称:　${data.title || "N/A"}`);
  lines.push(
    `❁ 歌　　手:　${
      data.artists && data.artists.length ? data.artists.join(" / ") : "N/A"
    }`
  );
  lines.push(`❁ 发行日期:　${data.release_date || "N/A"}`);
  lines.push(`❁ 专辑类型:　${data.album_type || "N/A"}`);
  lines.push(
    `❁ 流　　派:　${
      data.genres && data.genres.length ? data.genres.join(" / ").trim() : "N/A"
    }`
  );
  lines.push(`❁ 发 行 商:　${data.publisher || "N/A"}`);
  lines.push(`❁ 制作公司:　${data.planning || "N/A"}`);
  lines.push(`❁ 专辑链接:　${data.melon_link}`);

  if (data.description) {
    lines.push("");
    lines.push("❁ 专辑介绍\n");
    lines.push(`　　${data.description.replace(/\n/g, "\n　　")}`);
  }
  if (data.tracks && data.tracks.length) {
    lines.push("");
    lines.push("❁ 歌曲列表\n");
    data.tracks.forEach((t) => {
      const artists =
        t.artists && t.artists.length ? ` (${t.artists.join(", ")})` : "";
      lines.push(`　　${t.number || "-"}. ${t.title}${artists}`);
    });
  }

  return lines.join("\n").trim();
};

const generateBangumiFormat = (data) => {
  if (!data || typeof data !== "object") return "";

  const lines = [];

  if (data.poster) lines.push(`[img]${data.poster}[/img]`, "");
  lines.push(`❁ 片　　名:　${data.name}`);
  lines.push(`❁ 中 文 名:　${data.name_cn}`);

  if (isValidArray(data.aka)) {
    lines.push(
      formatWrappedLine({
        label: "❁ 别　　名:　",
        content: data.aka.join(" / "),
        maxWidth: MAX_WIDTH,
      })
    );
  }

  if (data.type) lines.push(`❁ 类　　型:　${data.type}`);
  if (data.eps) lines.push(`❁ 话　　数:　${data.eps}`);
  if (data.date) lines.push(`❁ 首　　播:　${data.date}`);
  if (data.year) lines.push(`❁ 年　　份:　${data.year}年`);
  if (data.bgm_rating) lines.push(`❁ 评　　分:　${data.bgm_rating}`);
  lines.push(`❁ 链　　接:　${data.link}`);
  if (data.platform) lines.push(`❁ 播放平台:　${data.platform}`);

  if (isValidArray(data.tags)) {
    lines.push(
      formatWrappedLine({
        label: "❁ 标　　签:　",
        content: data.tags.join(" / "),
        maxWidth: MAX_WIDTH,
      })
    );
  }

  const directorLine = processPersonField(data.director, "❁ 导　　演:　");
  if (directorLine) lines.push(directorLine);

  const writerLine = processPersonField(data.writer, "❁ 脚　　本:　");
  if (writerLine) lines.push(writerLine);

  if (isValidArray(data.characters)) {
    const charList = formatCharacters(ensureArray(data.characters));
    const content = charList.slice(0, 20).join(" / ").trim();
    lines.push(
      formatWrappedLine({
        label: "❁ 角色信息:　",
        content,
        maxWidth: 125,
      })
    );
  }

  if (data.summary) {
    lines.push("", "❁ 简　　介", `  ${data.summary.replace(/\n/g, "\n  ")}`);
  }

  return lines.join("\n").trim();
};

/**
 * 根据Steam数据生成格式化文本
 * @param {Object} data - Steam游戏数据对象
 * @returns {string} 格式化后的文本内容
 */
const generateSteamFormat = (data) => {
  const lines = [];
  if (data.header_image) lines.push(`[img]${data.header_image}[/img]\n`);

  lines.push(`❁ 游戏名称:　${data.name}`);
  lines.push(`❁ 游戏类型:　${data.type}`);
  lines.push(`❁ 发行日期:　${data.release_date}`);

  if (data.developers && data.developers.length) {
    lines.push(`❁ 开 发 商:　${data.developers.join(", ")}`);
  }
  if (data.publishers && data.publishers.length) {
    lines.push(`❁ 发 行 商:　${data.publishers.join(", ")}`);
  }
  if (data.genres && data.genres.length) {
    lines.push(`❁ 游戏类型:　${data.genres.join(", ")}`);
  }
  if (data.supported_languages) {
    const cleanedLanguages = cleanHtml(data.supported_languages)
      .replace(/\*具有完全音频支持的语言.*/g, "")
      .trim();
    lines.push(`❁ 支持语言:　${cleanedLanguages}`);
  }

  if (data.price) {
    if (data.price.discount > 0 && data.price.initial) {
      lines.push(`❁ 原　　价:　${data.price.initial} ${data.price.currency}`);
      lines.push(
        `❁ 现　　价:　${data.price.final} ${data.price.currency} (折扣${data.price.discount}%)`
      );
    } else if (data.price.final) {
      lines.push(`❁ 价　　格:　${data.price.final} ${data.price.currency}`);
    }
  }

  if (data.platforms) {
    const platforms = [];
    if (data.platforms.windows) platforms.push("Windows");
    if (data.platforms.mac) platforms.push("Mac");
    if (data.platforms.linux) platforms.push("Linux");
    if (platforms.length) lines.push(`❁ 支持平台:　${platforms.join(", ")}`);
  }

  if (data.categories && data.categories.length) {
    lines.push(
      formatWrappedLine({
        label: "❁ 分类标签:　",
        content: data.categories.join(" / "),
        maxWidth: MAX_WIDTH,
      })
    );
  }

  lines.push(`❁ 链　　接:　https://store.steampowered.com/app/${data.sid}/`);
  if (data.about_the_game) {
    const INDENT = "　　";
    const BULLET = "· ";
    const $ = page_parser(data.about_the_game);

    // 预处理部分保持不变
    $.root().find("h2, ul, p").before("<hr>");
    $.root()
      .find("br")
      .each(function () {
        const $this = $(this);
        let $next = $this.next();
        while ($next[0] && $next[0].type === "text" && !$next.text().trim()) {
          $next = $next.next();
        }
        if ($next.is("br")) {
          $this.replaceWith("<hr>");
          $next.remove();
        }
      });

    lines.push("", "❁ 简　　介");
    const blocksHTML = $.root()
      .html()
      .split(/<hr\s*\/?>/);
    blocksHTML.forEach((blockHtml) => {
      const $block = page_parser(blockHtml);
      const blockText = $block.root().text().trim();

      if (!blockText) return;
      if ($block("h2").length > 0) {
        lines.push("");
        lines.push(INDENT + blockText);
      } else if ($block("ul").length > 0) {
        $block("li").each((i, li) => {
          const liText = $(li).text().trim();
          if (liText) {
            lines.push(wrapTextWithIndent(liText, MAX_WIDTH, INDENT + BULLET));
          }
        });
      } else {
        lines.push(wrapTextWithIndent(blockText, MAX_WIDTH, INDENT));
      }
    });

    if (lines[lines.length - 1].trim() !== "❁ 简　　介") {
      lines.push("");
    }
  }

  if (data.pc_requirements && data.pc_requirements.minimum) {
    lines.push(processRequirements(data.pc_requirements.minimum, "最低配置"));
  }
  if (data.pc_requirements && data.pc_requirements.recommended) {
    lines.push(
      processRequirements(data.pc_requirements.recommended, "推荐配置")
    );
  }

  if (data.screenshots && data.screenshots.length) {
    lines.push("❁ 游戏截图");
    for (const s of data.screenshots) {
      if (s.path_full) lines.push(`[img]${s.path_full}[/img]`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
};

/**
 * 将游戏数据格式化为非缓存版的 Steam 格式文本。
 *
 * @param {Object} data - 包含游戏信息的对象
 * @returns {string} 格式化后的 Steam 文本内容
 * @throws {Error} 当输入不是对象或为空时抛出错误
 */
const notCacheSteamFormat = (data) => {
  // 数据基本校验
  if (!data || typeof data !== "object") {
    throw new Error("Invalid input: expected an object.");
  }

  const lines = [];

  if (data.cover) lines.push(`[img]${data.cover}[/img]\n`);
  lines.push(`❁ 游戏名称:　${data.name}`);

  const DETAIL_KEYS_MAP = {
    "类型:": "type",
    "发行日期:": "release_date",
    "开发者:": "developer",
    "发行商:": "publisher",
  };

  const info = {
    type: "",
    release_date: "",
    developer: "",
    publisher: "",
  };

  const detailLines = data.detail ? data.detail.split("\n") : [];
  detailLines.forEach((line) => {
    for (const [prefix, key] of Object.entries(DETAIL_KEYS_MAP)) {
      if (line.startsWith(prefix)) {
        info[key] = line.slice(prefix.length).trim();
        break;
      }
    }
  });

  lines.push(`❁ 游戏类型:　${info.type}`);
  lines.push(`❁ 发行日期:　${info.release_date}`);
  lines.push(`❁ 开 发 商:　${info.developer}`);
  lines.push(`❁ 发 行 商:　${info.publisher}`);

  if (data.language && data.language.length > 0) {
    lines.push(`❁ 支持语言:　${data.language.join(" / ")}`);
  }

  if (data.tags && data.tags.length > 0) {
    lines.push(
      formatWrappedLine({
        label: "❁ 分类标签:　",
        content: data.tags.join(" / "),
        maxWidth: MAX_WIDTH,
      })
    );
  }

  lines.push(
    `❁ 链　　接:　https://store.steampowered.com/app/${data.steam_id}/`
  );

  if (data.descr) {
    lines.push(`
❁ 简　　介　
　　${data.descr.replace(/\n/g, "\n　　")}`);
  }

  if (data.sysreq && data.sysreq.length > 0) {
    lines.push(`\n❁ 配置要求\n${data.sysreq.join("\n")}`);
  }

  if (data.screenshot && data.screenshot.length > 0) {
    lines.push("\n❁ 游戏截图");
    data.screenshot.forEach((s) => {
      lines.push(`[img]${s}[/img]`);
    });
    lines.push("");
  }

  return lines.join("\n").trim();
};

/**
 * 将IMDb数据格式化为非缓存版的 IMDB 格式文本。
 *
 * @param {Object} data - 包含电影或剧集信息的数据对象
 * @returns {string} 格式化后的字符串，用于展示IMDb相关信息
 */
const notCacheImdbFormat = (data) => {
  const lines = [];

  // 安全获取嵌套属性的方法
  const safeGet = (obj, path, defaultValue = "") => {
    return (
      path.split(".").reduce((acc, part) => acc && acc[part], obj) ||
      defaultValue
    );
  };

  const safeArray = (arr) => (Array.isArray(arr) ? arr : []);

  lines.push(`[img]${safeGet(data, "poster") || ""}[/img]\n`);
  lines.push(`❁ Original Title:　${safeGet(data, "name")}`);
  lines.push(`❁ Type:　${safeGet(data, "@type")}`);
  lines.push(`❁ Year:　${safeGet(data, "year")}`);

  const details = data.details || {};
  if (
    details["Country of origin"] &&
    safeArray(details["Country of origin"]).length > 0
  ) {
    lines.push(
      `❁ Origin Country:　${safeArray(details["Country of origin"]).join(
        " / "
      )}`
    );
  }

  if (data.genre && data.genre.length > 0) {
    lines.push(`❁ Genres:　${data.genre.join(" / ")}`);
  }

  if (details.Language && safeArray(details.Language).length > 0) {
    lines.push(`❁ Language:　${safeArray(details.Language).join(" / ")}`);
  }

  let durationStr = safeGet(data, "duration");
  if (durationStr !== null && durationStr !== undefined) {
    durationStr = durationStr.replace("PT", "").replace("H", "H ");
    lines.push(`❁ Runtime:　${durationStr}`);
  }

  lines.push(`❁ IMDb Rating:　${safeGet(data, "imdb_rating")}`);
  lines.push(`❁ IMDb Link:　${safeGet(data, "imdb_link")}`);
  lines.push(`❁ Release Date:　${safeGet(data, "datePublished")}`);

  if (
    details["Also known as"] &&
    safeArray(details["Also known as"]).length > 0
  ) {
    lines.push(
      `❁ Also Known As:　${safeArray(details["Also known as"]).join(" / ")}`
    );
  }

  const keywords = safeArray(data.keywords);
  if (keywords.length > 0) {
    lines.push(
      `❁ Keywords:　${keywords
        .map((k) => k.trim())
        .filter(Boolean)
        .join(" | ")}`
    );
  }

  const formatPeopleList = (peopleList) => {
    return safeArray(peopleList)
      .map((person) =>
        typeof person === "object" && person.name ? person.name : person
      )
      .filter(Boolean)
      .join(" / ")
      .trim();
  };

  if (data.directors && data.directors.length > 0) {
    lines.push(`❁ Directors:　${formatPeopleList(data.directors)}`);
  }

  if (data.creators && data.creators.length > 0) {
    lines.push(`❁ Writers:　${formatPeopleList(data.creators)}`);
  }

  if (data.actors && data.actors.length > 0) {
    lines.push(`❁ Actors:　${formatPeopleList(data.actors)}`);
  }

  if (data.description) {
    lines.push(`
❁ Plot　
　　${data.description.replace(/\n/g, "\n　　")}`);
  }

  return lines.join("\n").trim();
};

/**
 * 将番剧数据格式化为非缓存版的文本描述。
 *
 * @param {Object} data - 番剧数据对象
 * @returns {string} 格式化后的文本内容，如果输入无效则返回空字符串
 */
const notCacheBangumiFormat = (data) => {
  if (!data || typeof data !== "object") return "";

  const lines = [];

  if (data.cover) lines.push(`[img]${data.cover}[/img]`, "");
  lines.push(`❁ 片　　名:　${data.name}`);
  lines.push(`❁ 中 文 名:　${data.name_cn}`);

  if (isValidArray(data.aka)) {
    lines.push(
      formatWrappedLine({
        label: "❁ 别　　名:　",
        content: data.aka.join(" / "),
        maxWidth: MAX_WIDTH,
      })
    );
  }

  if (data.eps) lines.push(`❁ 话　　数:　${data.eps}`);
  if (data.date) lines.push(`❁ 首　　播:　${data.date}`);
  if (data.year) lines.push(`❁ 年　　份:　${data.year}年`);

  if (data.rating && typeof data.rating === "object") {
    const score = data.rating.score ?? 0;
    const total = data.rating.total ?? 0;
    lines.push(`❁ 评　　分:　${score} / 10 from ${total} users`);
  }

  lines.push(`❁ 链　　接:　${data.alt}`);
  if (data.platform) lines.push(`❁ 播放平台:　${data.platform}`);

  const directorLine = processPersonField(data.director, "❁ 导　　演:　");
  if (directorLine) lines.push(directorLine);

  const writerLine = processPersonField(data.writer, "❁ 脚　　本:　");
  if (writerLine) lines.push(writerLine);

  const characters = formatCharacters(ensureArray(data.cast));
  if (isValidArray(characters)) {
    const content = characters.slice(0, 20).join(" / ").trim();
    lines.push(
      formatWrappedLine({
        label: "❁ 角色信息:　",
        content,
        maxWidth: 125,
      })
    );
  }

  if (data.story) {
    lines.push("", "❁ 简　　介", `  ${data.story.replace(/\n/g, "\n  ")}`);
  }

  return lines.join("\n").trim();
};

/**
 * 生成红果短剧格式的文本内容
 * @param {Object} data - 包含影片信息的数据对象
 * @returns {string} 格式化后的红果格式文本
 */
const generateHongguoFormat = (data) => {
  const lines = [];

  if (data.poster_url) {
    lines.push(`[img]${data.poster_url}[/img]`, "");
  }

  lines.push(`❁ 片　　名:　${data.chinese_title}`);

  if (isValidArray(data.genres)) {
    lines.push(`❁ 类　　别:　${data.genres.join(" / ")}`);
  }

  if (data.episodes) {
    lines.push(`❁ 集　　数:　${data.episodes}`);
  }

  if (isValidArray(data.actors)) {
    const actorsFormatted = data.actors
      .map((actor) =>
        actor.sub_title
          ? `${actor.nickname} (${actor.sub_title})`
          : actor.nickname
      )
      .join(" / ");

    lines.push(`❁ 主　　演:　${actorsFormatted}`);
  }
  
  if (data.synopsis) {
    lines.push("❁ 简　　介", `    ${data.synopsis.replace(/\n/g, "\n\n    ")}`);
  }

  return lines.join("\n").trim();
};

/**
 * 生成QQ音乐专辑信息格式
 * @param {Object} data - QQ音乐专辑数据
 * @returns {string} 格式化后的文本
 */
const generateQQMusicFormat = (data) => {
  if (!data || typeof data !== "object") {
    return "";
  }

  const lines = [];

  if (data.cover) {
    lines.push(`[img]${data.cover}[/img]`, "");
  }

  if (data.name) {
    lines.push(`❁ 专辑名称:　${data.name}`);
  }

  if (Array.isArray(data.singer) && data.singer.length > 0) {
    const singers = data.singer.map((s) => s.name).join(" / ");
    lines.push(`❁ 歌　　手:　${singers}`);
  }

  if (data.albumType) {
    lines.push(`❁ 专辑类型:　${data.albumType}`);
  }

  if (data.language) {
    lines.push(`❁ 语　　种:　${data.language}`);
  }

  if (data.company) {
    lines.push(`❁ 发行公司:　${data.company}`);
  }

  if (data.publishTime) {
    lines.push(`❁ 发行时间:　${data.publishTime}`);
  }

  if (data.desc) {
    lines.push(
      "",
      "❁ 专辑介绍:",
      `  ${data.desc.replace(/\n/g, "\n\n  ")}`,
      ""
    );
  }

  if (Array.isArray(data.songList) && data.songList.length > 0) {
    lines.push("\n❁ 歌曲列表");
    data.songList.forEach((song, index) => {
      const singerNames =
        Array.isArray(song.singer) && song.singer.length > 0
          ? song.singer.map((s) => s.name).join(" / ")
          : "";

      lines.push(
        `　${(index + 1).toString().padStart(2, " ")}\. ${song.name}` +
          (song.sub_name ? ` (${song.sub_name})` : "") +
          (singerNames ? ` - ${singerNames}` : "") +
          (song.playTime ? ` [${song.playTime}]` : "")
      );
    });
  }

  return lines.join("\n");
};

/**
 * 根据提供的书籍数据生成符合豆瓣格式的文本描述。
 *
 * @param {Object} data - 包含书籍信息的对象
 * @returns {string} 格式化后的文本
 */
const generateDoubanBookFormat = (data) => {
  if (!data || typeof data !== 'object') {
    return '';
  }

  const lines = [];

  if (data.poster) lines.push(`[img]${data.poster}[/img]`, '');
  
  lines.push(`❁ 书　　名:　${data.title}`);
  if (data.original_title) {
    lines.push(`❁ 原　　名:　${data.original_title}`);
  }
  
  // 确保 author 是数组后再 join
  if (Array.isArray(data.author) && data.author.length) {
    lines.push(`❁ 作　　者:　${data.author.join(' / ').trim()}`);
  }
  
  // 确保 translator 存在且为数组
  if (Array.isArray(data.translator) && data.translator.length) {
    lines.push(`❁ 翻　　译:　${data.translator.join(' / ').trim()}`);
  }
  
  if (data.publisher) lines.push(`❁ 出 版 社:　${data.publisher}`);
  if (data.year) lines.push(`❁ 出版日期:　${data.year}`);
  if (data.pages) lines.push(`❁ 页　　数:　${data.pages}`);
  if (data.pricing) lines.push(`❁ 定　　价:　${data.pricing}`);
  if (data.binding) lines.push(`❁ 装　　帧:　${data.binding}`);
  if (data.series) lines.push(`❁ 丛　　书:　${data.series}`);
  if (data.isbn) lines.push(`❁ I S B N:　${data.isbn}`);
  
  // 确保评分和投票数都存在
  if (data.rating && data.votes) {
    lines.push(`❁ 豆瓣评分:　${data.rating} / 10 from ${data.votes} users`);
  }
  
  if (data.link) lines.push(`❁ 豆瓣链接:　${data.link}`);
  if (data.introduction) {
    let formattedIntro = data.introduction.replace(/\s{4,}/g, '\n\n');
    
    formattedIntro = formattedIntro
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => `    ${line}`)
      .join('\n\n');
      
    lines.push("\n❁ 简　　介\n", formattedIntro);
  }

  return lines.join("\n");
};

/**
 * 解析评分信息
 * @param {Object} $ - cheerio实例
 * @param {Object} ldJson - JSON-LD数据
 * @returns {Object} 包含评分和投票数的对象
 */
const parseRatingInfo = ($, ldJson) => {
  const ratingInfo = ldJson.aggregateRating || {};
  const pageRatingAverage = $("#interest_sectl .rating_num").text().trim();
  const pageVotes = $('#interest_sectl span[property="v:votes"]').text().trim();

  const average = safe(ratingInfo.ratingValue || pageRatingAverage || "0", "0");
  const votes = safe(ratingInfo.ratingCount || pageVotes || "0", "0");

  return {
    average,
    votes,
    formatted:
      parseFloat(average) > 0 && parseInt(votes) > 0
        ? `${average} / 10 from ${votes} users`
        : "0 / 10 from 0 users",
  };
};

/**
 * 提取名人信息的通用函数
 * @param {Object} $ - cheerio实例
 * @param {string} section - 区块名称（导演/编剧/演员）
 * @param {boolean} extractRole - 是否提取角色信息
 * @returns {Array} 名人信息数组
 */
const extractCelebrities = ($, section, extractRole = false) => {
  const celebrities = [];
  $(`.list-wrapper h2:contains("${section}")`)
    .closest(".list-wrapper")
    .find(".celebrities-list .celebrity")
    .each(function () {
      const $el = $(this);
      const name = $el.find(".info .name a").text().trim();

      if (!name) return;

      const link = $el.find(".info .name a").attr("href") || "";
      const roleText = $el.find(".info .role").text().trim();

      let role = "";
      if (extractRole && roleText) {
        const roleMatch = roleText.match(/饰\s*([^()]+)/);
        role = roleMatch ? `饰 ${roleMatch[1].trim()}` : "";
      } else {
        role = roleText;
      }

      const avatarMatch = $el
        .find(".avatar")
        .attr("style")
        ?.match(/url\(([^)]+)\)/);
      const avatar = avatarMatch ? avatarMatch[1] : "";

      celebrities.push({ name, link, role, avatar });
    });

  return celebrities;
};

/**
 * 获取名人信息（导演、编剧、演员）
 * @param {string} baseLink - 基础URL
 * @param {Object} headers - 请求头
 * @returns {Promise<Object>} 包含导演、编剧、演员信息的对象
 */
const fetchCelebritiesInfo = async (baseLink, headers) => {
  try {
    // 添加重试逻辑，最多重试3次
    let lastError;
    for (let i = 0; i < 3; i++) {
      try {
        const response = await fetchWithTimeout(
          `${baseLink}celebrities`,
          { headers }
        );

        if (!response?.ok) {
          lastError = new Error(
            `HTTP ${response?.status}: ${response?.statusText}`
          );
          // 如果是客户端错误(4xx)，不重试
          if (response?.status >= 400 && response?.status < 500) {
            break;
          }
          continue;
        }

        const html = await response.text();
        const $ = page_parser$1(html);

        return {
          director: extractCelebrities($, "导演"),
          writer: extractCelebrities($, "编剧"),
          cast: extractCelebrities($, "演员", true),
        };
      } catch (error) {
        lastError = error;
        // 如果是超时错误，继续重试
        if (error?.name === "AbortError" && i < 2) {
          console.warn(
            `Celebrities fetch attempt ${i + 1} failed, retrying...`,
            error.message
          );
          continue;
        }
        // 其他错误直接抛出
        break;
      }
    }

    console.error("Celebrities fetch failed after retries:", lastError);
    return {};
  } catch (error) {
    console.error("Celebrities fetch error:", error);
    return {};
  }
};

/**
 * 获取奖项信息
 * @param {string} baseLink - 基础URL
 * @param {Object} headers - 请求头
 * @returns {Promise<Array>} 奖项信息数组
 */
const fetchAwardsInfo = async (baseLink, headers) => {
  try {
    // 添加重试逻辑，最多重试3次
    let lastError;
    for (let i = 0; i < 3; i++) {
      try {
        const response = await fetchWithTimeout(
          `${baseLink}awards`,
          { headers },
          8000
        );

        if (!response?.ok) {
          lastError = new Error(
            `HTTP ${response?.status}: ${response?.statusText}`
          );
          // 如果是客户端错误(4xx)，不重试
          if (response?.status >= 400 && response?.status < 500) {
            break;
          }
          continue;
        }

        const html = await response.text();
        const $ = page_parser$1(html);
        const awardSections = [];

        $(".awards").each(function () {
          const $awards = $(this);
          const $hd = $awards.find(".hd h2");
          const festival = $hd.find("a").text().trim();
          const year = $hd.find(".year").text().trim();
          const festivalFull = `${festival} ${year}`;
          const sectionLines = [festivalFull];

          $awards.find("ul.award").each(function () {
            const $ul = $(this);
            const items = $ul.find("li");

            if (items.length >= 2) {
              const category = $(items[0]).text().trim();
              const winners = $(items[1]).text().trim();
              const awardInfo = winners ? `${category} ${winners}` : category;
              sectionLines.push(awardInfo);
            }
          });

          if (sectionLines.length > 1) {
            awardSections.push(sectionLines.join("\n"));
          }
        });

        const awardsText = awardSections.join("\n\n");
        return parseDoubanAwards(awardsText);
      } catch (error) {
        lastError = error;
        // 如果是超时错误，继续重试
        if (error?.name === "AbortError" && i < 2) {
          console.warn(
            `Awards fetch attempt ${i + 1} failed, retrying...`,
            error.message
          );
          continue;
        }
        // 其他错误直接抛出
        break;
      }
    }

    console.error("Awards fetch failed after retries:", lastError);
    return [];
  } catch (error) {
    console.error("Awards fetch error:", error);
    return [];
  }
};

/**
 * 获取IMDb评分信息
 * @param {string} imdbId - IMDb ID
 * @param {Object} headers - 请求头
 * @returns {Promise<Object|null>} IMDb评分信息
 */
const fetchImdbRating = async (imdbId, headers) => {
  try {
    // 添加重试逻辑，最多重试3次
    let lastError;
    for (let i = 0; i < 3; i++) {
      try {
        const url = `https://p.media-imdb.com/static-content/documents/v1/title/${imdbId}/ratings%3Fjsonp=imdb.rating.run:imdb.api.title.ratings/data.json`;
        const response = await fetchWithTimeout(url, { headers }, 8000);

        if (!response?.ok) {
          lastError = new Error(
            `HTTP ${response?.status}: ${response?.statusText}`
          );
          // 如果是客户端错误(4xx)，不重试
          if (response?.status >= 400 && response?.status < 500) {
            break;
          }
          continue;
        }

        const raw = await response.text();
        const json = jsonp_parser(raw);

        if (!json?.resource) {
          lastError = new Error("Invalid JSON response");
          continue;
        }

        const average = json.resource.rating || 0;
        const votes = json.resource.ratingCount || 0;

        return {
          average,
          votes,
          formatted: `${average} / 10 from ${votes} users`,
        };
      } catch (error) {
        lastError = error;
        // 如果是超时错误，继续重试
        if (error?.name === "AbortError" && i < 2) {
          console.warn(
            `IMDb rating fetch attempt ${i + 1} failed, retrying...`,
            error.message
          );
          continue;
        }
        // 其他错误直接抛出
        break;
      }
    }

    console.error("IMDb rating fetch failed after retries:", lastError);
    return null;
  } catch (error) {
    console.error("IMDb API error:", error);
    return null;
  }
};

/**
 * 异步生成指定豆瓣ID对应的影视信息数据
 * @param {string|number} sid - 豆瓣电影的唯一标识符
 * @param {Object} env - 环境配置对象
 * @returns {Promise<Object>} 返回豆瓣数据对象
 */
const gen_douban = async (sid, env) => {
  const data = { site: "douban", sid };

  if (!sid) {
    return { ...data, error: "Invalid Douban id" };
  }

  const headers = buildHeaders$1(env);
  const baseLink = `https://movie.douban.com/subject/${encodeURIComponent(
    sid
  )}/`;
  const mobileLink = `https://m.douban.com/movie/subject/${encodeURIComponent(
    sid
  )}/`;

  try {
    if (env.ENABLED_CACHE === "false") {
      // 尝试从PtGen Archive获取数据
      const cachedData = await getStaticMediaDataFromOurBits("douban", sid);
      if (cachedData) {
        console.log(`[Cache Hit] GitHub OurBits DB For Douban ${sid}`);
        return { ...data, ...cachedData, success: true };
      }
    }

    // 请求主页面
    let response = await fetchWithTimeout(
      baseLink,
      { headers }
    );

    // 如果主页面失败，尝试移动端
    const retryStatuses = new Set([204, 403, 521]);
    if (!response || retryStatuses.has(response.status)) {
      try {
        const mobileResponse = await fetchWithTimeout(
          mobileLink,
          { headers }
        );
        if (mobileResponse?.ok) {
          response = mobileResponse;
        }
      } catch (error) {
        console.warn(`Mobile page fallback failed for ${sid}:`, error);
      }
    }

    if (!response) {
      return { ...data, error: "No response from Douban" };
    }

    if (response.status === 404) {
      return { ...data, error: NONE_EXIST_ERROR };
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        ...data,
        error: isAntiBot(text)
          ? ANTI_BOT_ERROR
          : `Failed to fetch: ${response.status} ${text.slice(0, 200)}`,
      };
    }

    const html = await response.text();

    if (NOT_FOUND_PATTERN.test(html)) {
      return { ...data, error: NONE_EXIST_ERROR };
    }

    if (isAntiBot(html)) {
      return { ...data, error: ANTI_BOT_ERROR };
    }

    // 解析页面
    const $ = page_parser$1(html);
    const ldJson = parseJsonLd($);
    const title = $("title").text().replace("(豆瓣)", "").trim();
    const foreignTitle = $('span[property="v:itemreviewed"]')
      .text()
      .replace(title, "")
      .trim();

    const yearMatch = $("#content > h1 > span.year").text().match(/\d{4}/);
    const year = yearMatch ? yearMatch[0] : "";
    const akaText = fetchAnchorText($('#info span.pl:contains("又名")'));
    const aka = akaText
      ? akaText
          .split(" / ")
          .map((s) => s.trim())
          .filter(Boolean)
          .sort()
      : [];

    const regionText = fetchAnchorText(
      $('#info span.pl:contains("制片国家/地区")')
    );
    const region = regionText
      ? regionText
          .split(" / ")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const languageText = fetchAnchorText($('#info span.pl:contains("语言")'));
    const language = languageText
      ? languageText
          .split(" / ")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const genre = $('#info span[property="v:genre"]')
      .map(function () {
        return $(this).text().trim();
      })
      .get();

    const playdate = $('#info span[property="v:initialReleaseDate"]')
      .map(function () {
        return $(this).text().trim();
      })
      .get()
      .sort((a, b) => new Date(a) - new Date(b));

    const episodes = fetchAnchorText($('#info span.pl:contains("集数")'));
    const durationText = fetchAnchorText(
      $('#info span.pl:contains("单集片长")')
    );
    const duration =
      durationText || $('#info span[property="v:runtime"]').text().trim() || "";

    const introSelector =
      '#link-report-intra > span.all.hidden, #link-report-intra > [property="v:summary"], #link-report > span.all.hidden, #link-report > [property="v:summary"]';
    const introduction = $(introSelector)
      .text()
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .join("\n");

    const tags = $('div.tags-body > a[href^="/tag"]')
      .map(function () {
        return $(this).text().trim();
      })
      .get();

    const poster = ldJson.image
      ? String(ldJson.image)
          .replace(/s(_ratio_poster|pic)/g, "l$1")
          .replace("img3", "img1")
          .replace(/\.webp$/, ".jpg")
      : "";

    const doubanRating = parseRatingInfo($, ldJson);
    const imdbText = fetchAnchorText($('#info span.pl:contains("IMDb")'));
    let imdbInfo = {};
    if (imdbText && /^tt\d+$/.test(imdbText)) {
      data.imdb_id = imdbText;
      data.imdb_link = `https://www.imdb.com/title/${imdbText}/`;
      imdbInfo = (await fetchImdbRating(imdbText, headers)) || {};
    }

    // 并发获取名人和奖项信息
    const [celebritiesInfo, awards] = await Promise.all([
      fetchCelebritiesInfo(baseLink, headers),
      fetchAwardsInfo(baseLink, headers),
    ]);

    Object.assign(data, {
      douban_link: baseLink,
      chinese_title: title,
      foreign_title: foreignTitle,
      year,
      aka,
      region,
      genre,
      language,
      playdate,
      episodes,
      duration,
      introduction,
      poster,
      tags,
      douban_rating_average: doubanRating.average,
      douban_votes: doubanRating.votes,
      douban_rating: doubanRating.formatted,
      ...celebritiesInfo,
      awards,
    });

    if (imdbInfo.average) {
      data.imdb_rating_average = imdbInfo.average;
      data.imdb_votes = imdbInfo.votes;
      data.imdb_rating = imdbInfo.formatted;
    }

    data.success = true;

    return data;
  } catch (error) {
    return { ...data, error: error?.message || String(error) };
  }
};

const DATA_SELECTOR = "script#__NEXT_DATA__";
const NEWLINE_CLEAN_RE = /[\r\n]/g;

// 更安全地缓存 headers 避免副作用
const getHeaders = (() => {
  let cachedHeaders = null;
  return () => {
    if (cachedHeaders) return { ...cachedHeaders };
    cachedHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      "sec-ch-ua":
        '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "Cache-Control": "max-age=0",
      Priority: "u=0, i",
    };
    return { ...cachedHeaders };
  };
})();

/**
 * 安全设置 data 字段，仅当值有效时才设置
 */
const setIfDefined = (obj, key, val) => {
  if (val !== undefined && val !== null) obj[key] = val;
};

/**
 * 尝试解析JSON字符串
 * @param {string} text - 需要解析的JSON字符串
 * @returns {object|null} 解析成功的JSON对象，如果解析失败或输入为空则返回null
 */
const tryParseJson = (text) => {
  if (!text) return null;
  const cleaned = text.replace(NEWLINE_CLEAN_RE, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
};

/**
 * 解析页面数据函数
 * @param {string} htmlContent - HTML内容字符串
 * @param {string} dataType - 数据类型，默认为'page'
 * @returns {Object} 包含解析信息和数据的对象
 */
const parsePageData = (htmlContent, dataType = "page") => {
  const $ = page_parser$1(htmlContent);
  let data = {};

  try {
    const $dataElement = $(DATA_SELECTOR);
    if ($dataElement.length > 0) {
      const htmlStr = $dataElement.first().html();
      const parsed = tryParseJson(htmlStr);
      if (parsed) {
        data = parsed;
      } else {
        console.warn(
          `Failed to parse __NEXT_DATA__ for ${dataType}: invalid JSON format`
        );
      }
    }
  } catch (e) {
    console.warn(`Error parsing __NEXT_DATA__ for ${dataType}:`, e);
  }

  return {
    info: $,
    data: data,
  };
};

/**
 * 提取发布信息和别名信息
 * @param {Object} nextData - 从页面中解析出的NEXT_DATA数据
 * @returns {Object} 包含releases和akas两个数组的对象
 */
const extractReleaseAndAkaInfo = (nextData) => {
  const result = {
    releases: [],
    akas: [],
  };

  try {
    const categories =
      nextData?.props?.pageProps?.contentData?.categories || [];

    for (const category of categories) {
      const sectionItems = category?.section?.items || [];
      switch (category.id) {
        case "releases":
          result.releases = sectionItems.map((item) => ({
            country: item.rowTitle || null,
            date: item.listContent?.[0]?.text || null,
            event: item.listContent?.[0]?.subText || null,
          }));
          break;
        case "akas":
          result.akas = sectionItems.map((item) => ({
            country: item.rowTitle || "(original title)",
            title: item.listContent?.[0]?.text || null,
            note: item.listContent?.[0]?.subText || null,
          }));
          break;
      }
    }
  } catch (e) {
    console.warn("Error extracting release and AKA info:", e);
  }

  return result;
};

/**
 * 异步生成指定 IMDb ID 对应的影视信息数据。
 *
 * @param {string|number} sid - IMDb 的唯一标识符（可带或不带前缀 "tt"）。
 * @returns {Promise<object>} 返回一个包含 IMDb 数据的对象，包括基础信息、演员表、导演编剧、分级证书等，
 *                            若发生错误则返回带有 error 字段的失败信息。
 */
const gen_imdb = async (sid, env) => {
  let raw = String(sid).trim();

  // 校验输入合法性
  if (!raw || !/^\d+$/.test(raw.replace(/^tt/, ""))) {
    return { site: "imdb", sid, error: "Invalid IMDB id" };
  }

  if (raw.startsWith("tt")) raw = raw.slice(2);
  const paddedId = raw.padStart(7, "0");
  const data = { site: "imdb", sid: paddedId };

  try {
    if (env.ENABLED_CACHE === "false") {
      // 尝试从PtGen Archive获取数据
      const cachedData = await getStaticMediaDataFromOurBits(
        "imdb",
        `tt${paddedId}`
      );
      if (cachedData) {
        console.log(`[Cache Hit] GitHub OurBits DB For IMDB tt${paddedId}`);
        return { ...data, ...cachedData, success: true };
      }
    } else {
      const imdb_id = "tt" + paddedId;
      const imdb_url = `https://www.imdb.com/title/${imdb_id}/`;
      const imdb_url_release_info = `https://www.imdb.com/title/${imdb_id}/releaseinfo`;
      const imdb_url_mpaa = `https://www.imdb.com/title/${imdb_id}/parentalguide`;

      const headers = getHeaders();

      const [pageResult, releaseInfoResult, mpaaResult] =
        await Promise.allSettled([
          fetchWithTimeout(imdb_url, { headers }, DEFAULT_TIMEOUT),
          fetchWithTimeout(imdb_url_release_info, { headers }, DEFAULT_TIMEOUT),
          fetchWithTimeout(imdb_url_mpaa, { headers }, DEFAULT_TIMEOUT),
        ]);

      if (pageResult.status === "rejected") {
        console.error("IMDb fetch error:", pageResult.reason);
        return Object.assign(data, {
          error:
            "Failed to fetch IMDb page. This may be due to network issues or Cloudflare protection.",
          originalError: pageResult.reason,
        });
      }

      const pageResp = pageResult.value;
      if (!pageResp || !pageResp.ok) {
        const status = pageResp ? pageResp.status : "no response";
        if (pageResp && pageResp.status === 404)
          return Object.assign(data, { error: NONE_EXIST_ERROR });
        return Object.assign(data, {
          error: `IMDb page request failed with status ${status}. This may be due to Cloudflare protection.`,
          originalError: pageResp,
        });
      }

      const pageHtml = await pageResp.text();
      const pageData = parsePageData(pageHtml);
      const props = pageData.data.props?.pageProps || {};
      const aboveTheFoldData = props.aboveTheFoldData || {};
      const mainColumnData = props.mainColumnData || {};
      const releaseDateData = aboveTheFoldData.releaseDate;
      const countriesOfOrigin =
        mainColumnData.countriesDetails?.countries || [];
      const castV2Data = mainColumnData.castV2;
      const crewV2Data = mainColumnData.crewV2;

      if (releaseInfoResult.status === "fulfilled") {
        const releaseInfoResp = releaseInfoResult.value;
        if (releaseInfoResp && releaseInfoResp.ok) {
          const releaseInfoHtml = await releaseInfoResp.text();
          const releaseData = parsePageData(releaseInfoHtml, "release info");
          const { releases, akas } = extractReleaseAndAkaInfo(releaseData.data);
          data.aka = akas;
          data.release = releases;
        }
      } else {
        console.warn("Release info fetch failed:", releaseInfoResult.reason);
      }

      if (mpaaResult.status === "fulfilled") {
        const parentalGuideResp = mpaaResult.value;
        if (parentalGuideResp && parentalGuideResp.ok) {
          const parentalGuideHtml = await parentalGuideResp.text();
          const parentalGuideData = parsePageData(
            parentalGuideHtml,
            "parental guide"
          );
          const certificatesData =
            parentalGuideData.data.props?.pageProps?.contentData
              ?.certificates || [];
          if (Array.isArray(certificatesData) && certificatesData.length > 0) {
            data.certificates = certificatesData.map((cert) => ({
              country: cert.country,
              ratings: cert.ratings.map((rating) => ({
                rating: rating.rating,
                extraInformation: rating.extraInformation,
              })),
            }));
          }
        }
      } else {
        console.warn("Parental guide fetch failed:", mpaaResult.reason);
      }

      setIfDefined(data, "image", aboveTheFoldData.primaryImage?.url);
      setIfDefined(
        data,
        "original_title",
        aboveTheFoldData.originalTitleText?.text
      );
      const releaseYear = aboveTheFoldData.releaseYear?.year;
      setIfDefined(data, "year", releaseYear);

      data.languages =
        mainColumnData.spokenLanguages?.spokenLanguages?.map(
          (lang) => lang.text
        ) || [];

      if (releaseDateData) {
        data.release_date = {
          year: releaseDateData.year,
          month: releaseDateData.month,
          day: releaseDateData.day,
          country: releaseDateData.country?.text || "",
        };
      }

      setIfDefined(
        data,
        "runtime",
        aboveTheFoldData.runtime?.displayableProperty?.value?.plainText
      );
      setIfDefined(
        data,
        "rating",
        aboveTheFoldData.ratingsSummary?.aggregateRating || 0
      );
      setIfDefined(
        data,
        "vote_count",
        aboveTheFoldData.ratingsSummary?.voteCount || 0
      );
      data.type =
        aboveTheFoldData.titleType?.categories?.map((c) => c.value) || [];
      data.genres = aboveTheFoldData.genres?.genres?.map((g) => g.text) || [];
      setIfDefined(data, "plot", aboveTheFoldData.plot?.plotText?.plainText);
      data.link = imdb_url;
      data.origin_country =
        countriesOfOrigin.length > 0
          ? countriesOfOrigin.map((country) => country.text)
          : null;

      if (mainColumnData.episodes) {
        setIfDefined(data, "episodes", mainColumnData.episodes.episodes?.total);
        data.seasons =
          mainColumnData.episodes.seasons?.map((season) => season.number) || [];
      }

      if (aboveTheFoldData?.keywords?.edges) {
        data.keywords = aboveTheFoldData.keywords.edges
          .map((edge) => edge.node?.text)
          .filter(Boolean);
      }

      if (Array.isArray(castV2Data) && castV2Data.length > 0) {
        const topCastGroup = castV2Data[0];
        if (topCastGroup?.credits) {
          data.cast = topCastGroup.credits
            .map((credit) => ({
              name: credit.name?.nameText?.text || "",
              image: credit.name?.primaryImage?.url || null,
              character:
                credit.creditedRoles?.edges?.[0]?.node?.characters?.edges?.[0]
                  ?.node?.name || null,
            }))
            .filter((c) => c.name); // 过滤掉无名角色
        }
      }

      if (Array.isArray(crewV2Data)) {
        const directors = [];
        const writers = [];

        for (const group of crewV2Data) {
          const groupType = group.grouping?.text?.toLowerCase();
          const credits = group.credits || [];
          const names = credits
            .map((credit) => credit.name?.nameText?.text)
            .filter(Boolean);

          if (groupType === "director") {
            directors.push(...names);
          } else if (groupType === "writers") {
            writers.push(...names);
          }
        }

        if (directors.length > 0) data.directors = directors;
        if (writers.length > 0) data.writers = writers;
      }

      data.success = true;
      console.log("IMDb data successfully generated");
      return data;
    }
  } catch (error) {
    console.error("IMDb processing error:", error);
    return Object.assign(
      { site: "imdb", sid },
      {
        error: `IMDb processing error: ${error?.message || error}`,
        originalError: error,
      }
    );
  }
};

const BGM_API_BASE = "https://api.bgm.tv/v0";
const BGM_API_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Referer': 'https://bgm.tv/'
};

const TYPE_MAP = new Map([
  ['anime', '动画'],
  ['book', '书籍'],
  ['game', '游戏'],
  ['music', '音乐'],
  ['real', '三次元'],
  ['tv', '电视'],
  ['movie', '电影'],
  [1, '书籍'],
  [2, '动画'],
  [3, '音乐'],
  [4, '游戏'],
  [6, '三次元']
]);

/**
 * 标准化条目类型，根据传入的subject对象获取可读的类型名称
 * @param {Object} subject - 条目对象，包含类型相关信息
 * @returns {string} 返回标准化后的类型名称，如果无法识别则返回空字符串或原始值
 */
const normalizeType = (subject) => {
  if (!subject || typeof subject !== 'object') return '';

  const readableFields = ['type_name', 'type_cn'];
  for (const field of readableFields) {
    const value = subject[field];
    if (value && typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  const typeKey = subject.type;
  if ((typeof typeKey === 'string' && typeKey.trim()) || typeof typeKey === 'number') {
    const normalizedKey = typeof typeKey === 'string' ? typeKey.trim().toLowerCase() : typeKey;
    return TYPE_MAP.get(normalizedKey) ?? String(typeKey);
  }

  return '';
};

/**
 * 从信息框数组中获取指定键对应的值
 * @param {Array} infobox - 信息框数组，每个元素应包含key和value属性
 * @param {string} key - 要查找的键名
 * @returns {*} 返回找到的值，如果未找到则返回undefined
 */
const getInfoboxValue = (infobox, key) => {
  const item = infobox?.find(i => i.key === key);
  return item?.value;
};

/**
 * 获取信息框中指定键的数组值
 * @param {Object} infobox - 信息框对象
 * @param {string} key - 要获取值的键名
 * @returns {Array} 返回处理后的数组值，如果原值为数组则提取其中的v属性并过滤空值，否则返回安全处理后的值
 */
const getInfoboxArrayValues = (infobox, key) => {
  const value = getInfoboxValue(infobox, key);
  if (Array.isArray(value)) {
    return value.map(a => a.v).filter(v => v != null);
  }
  return safe(value);
};

/**
 * 异步获取 Bangumi（番组计划）条目信息并格式化为统一数据结构。
 *
 * @param {string|number} sid - Bangumi 条目的唯一标识符（subject ID）
 * @returns {Promise<Object>} 返回一个包含 Bangumi 数据或错误信息的对象：
 *   - site: 固定值 "bangumi"
 *   - sid: 原始传入的 sid
 *   - success: 是否成功获取并处理了数据
 *   - 其他字段根据 Bangumi API 的响应进行映射与加工
 */
async function gen_bangumi(sid, env) {
  const data = { site: "bangumi", sid };
  if (!sid) return Object.assign(data, { error: "Invalid Bangumi subject id" });

  const subjectUrl = `${BGM_API_BASE}/subjects/${encodeURIComponent(sid)}`;
  const charactersUrl = `${subjectUrl}/characters`;

  try {
    if (env.ENABLED_CACHE === "false") {
          // 尝试从PtGen Archive获取数据
          const cachedData = await getStaticMediaDataFromOurBits(
            "bangumi",
            sid
          );
          if (cachedData) {
            console.log(`[Cache Hit] GitHub OurBits DB For Bangumi ${sid}`);
            if (typeof cachedData.staff === 'object' && cachedData.staff !== null) {
                data.director = getInfoboxArrayValues(cachedData.staff, '导演');
                data.writer = getInfoboxArrayValues(cachedData.staff, '脚本');
            } else {
                data.director = [];
                data.writer = [];
            }
            return { ...data, ...cachedData, success: true };
          }
    } else {
    const subjResp = await fetchWithTimeout(subjectUrl, { headers: BGM_API_HEADERS, timeout: 20000 });
    if (!subjResp) return Object.assign(data, { error: "No response from Bangumi API" });

    if (subjResp.status === 404) {
      return Object.assign(data, { error: "Subject not found on Bangumi" });
    }

    if (!subjResp.ok) {
      const txt = await subjResp.text().catch(() => '');
      return Object.assign(data, { error: `Bangumi subject request failed ${subjResp.status}: ${txt}` });
    }

    const subject = await subjResp.json().catch(() => null);
    if (!subject) return Object.assign(data, { error: "Failed to parse Bangumi subject response" });

    // 获取角色列表
    let characters = [];
    try {
      const charResp = await fetchWithTimeout(charactersUrl, { headers: BGM_API_HEADERS, timeout: 15000 });
      if (charResp && charResp.ok) {
        characters = await charResp.json().catch(() => []);
      } else {
        console.warn(`[bgm] characters fetch failed for ${sid}`);
      }
    } catch (err) {
      console.warn(`[bgm] unexpected error fetching characters for ${sid}`, err.message);
    }

    data.bgm_id = subject.id ?? sid;
    data.name = safe(subject.name);
    data.name_cn = safe(getInfoboxValue(subject.infobox, '中文名'), subject.name_cn);
    data.link = `https://bangumi.tv/subject/${subject.id}`;

    if (typeof subject.infobox === 'object' && subject.infobox !== null) {
        data.aka = getInfoboxArrayValues(subject.infobox, '别名');
        data.director = getInfoboxArrayValues(subject.infobox, '导演');
        data.writer = getInfoboxArrayValues(subject.infobox, '脚本');
    } else {
        data.aka = [];
        data.director = [];
        data.writer = [];
    }

    data.summary = safe(subject.summary);
    data.poster = subject.images?.medium ?? subject.images?.common ?? '';

    const score = subject.rating?.score;
    const total = subject.rating?.total ?? 0;
    data.bgm_rating_average = score ?? 0;
    data.bgm_votes = total;
    data.bgm_rating = score ? `${score} / 10 from ${total} users` : '';

    data.date = safe(subject.date);
    if (data.date && !isNaN(new Date(data.date).getTime())) {
        data.year = String(data.date).slice(0, 4);
    } else {
        data.year = '';
    }

    data.platform = safe(subject.platform);
    data.type = normalizeType(subject) || '';
    data.eps = subject.eps ?? subject.total_episodes ?? '';
    data.tags = Array.isArray(subject.meta_tags) ? subject.meta_tags : [];
    data.characters = characters;
    data.success = true;

    return data;
  }
  } catch (e) {
    const message = e?.message || String(e);
    return Object.assign(data, { error: `Bangumi processing error: ${message}` });
  }
}

const TMDB_API_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

/**
 * 解析媒体资源标识符SID
 * @param {string|number} sid - 媒体资源标识符，可以是字符串或数字
 * @returns {Object|null} 解析结果对象，包含media_type和media_id属性；如果解析失败则返回null
 */
const parseSid = sid => {
  if (!sid) return null;
  const s = String(sid).trim();
  if (!s) return null;
  if (s.includes('/')) {
    const [type, id] = s.split('/').map(x => x.trim());
    if (!id) return null;
    return { media_type: type || 'movie', media_id: id };
  }
  // 仅数字或字符串id，默认 movie
  return { media_type: 'movie', media_id: s };
};

/**
 * 构建统一格式的媒体数据对象，根据 TMDB 返回的数据和媒体类型（电影或电视剧）提取并处理关键信息。
 *
 * @param {Object} tmdb_data - 来自 TMDB API 的原始响应数据对象
 * @param {string} media_type - 媒体类型，'movie' 表示电影，其他值表示电视剧（如 'tv'）
 * @returns {Object} 格式化后的媒体数据对象，包含标题、年份、评分、演员等信息
 */
const buildResult = (tmdb_data, media_type) => {
  const data = {};
  data.tmdb_id = tmdb_data.id;

  const getTitleField = (fieldMovie, fieldTv) =>
    media_type === 'movie' ? safe(tmdb_data[fieldMovie]) : safe(tmdb_data[fieldTv]);

  data.title = getTitleField('title', 'name');
  data.original_title = getTitleField('original_title', 'original_name');

  data.overview = safe(tmdb_data.overview, '');
  data.poster = tmdb_data.poster_path ? `${TMDB_IMAGE_BASE_URL}${tmdb_data.poster_path}` : '';
  data.backdrop = tmdb_data.backdrop_path ? `${TMDB_IMAGE_BASE_URL}${tmdb_data.backdrop_path}` : '';

  if (media_type === 'movie') {
    data.release_date = safe(tmdb_data.release_date, '');
    data.year = data.release_date ? data.release_date.slice(0, 4) : '';
    data.runtime = tmdb_data.runtime ? `${tmdb_data.runtime} minutes` : '';
  } else {
    data.first_air_date = safe(tmdb_data.first_air_date, '');
    data.last_air_date = safe(tmdb_data.last_air_date, '');
    data.year = data.first_air_date ? data.first_air_date.slice(0, 4) : '';
    data.episode_run_time = (tmdb_data.episode_run_time && tmdb_data.episode_run_time.length > 0)
      ? `${tmdb_data.episode_run_time[0]} minutes`
      : '';
    data.number_of_episodes = tmdb_data.number_of_episodes || '';
    data.number_of_seasons = tmdb_data.number_of_seasons || '';
  }

  data.tmdb_rating_average = safe(tmdb_data.vote_average, 0);
  data.tmdb_votes = safe(tmdb_data.vote_count, 0);
  data.tmdb_rating = `${data.tmdb_rating_average || 0} / 10 from ${data.tmdb_votes || 0} users`;
  data.genres = Array.isArray(tmdb_data.genres) ? tmdb_data.genres.map(g => g.name) : [];
  data.languages = Array.isArray(tmdb_data.spoken_languages)
    ? tmdb_data.spoken_languages.map(l => l.english_name || l.name)
    : [];
  data.countries = Array.isArray(tmdb_data.production_countries)
    ? tmdb_data.production_countries.map(c => c.name)
    : [];
  data.production_companies = Array.isArray(tmdb_data.production_companies)
    ? tmdb_data.production_companies.map(c => c.name)
    : [];

  // credits 初始化
  data.directors = [];
  data.producers = [];
  data.cast = [];

  const credits = tmdb_data.credits;
  if (credits) {
    if (Array.isArray(credits.crew)) {
      for (const person of credits.crew) {
        if (!person) continue;
        if (person.job === 'Director') {
          data.directors.push({ name: person.name, id: person.id });
        } else if (person.job === 'Producer') {
          data.producers.push({ name: person.name, id: person.id });
        }
      }
    }

    if (Array.isArray(credits.cast)) {
      data.cast = credits.cast
        .map(actor => {
          const image = actor.profile_path ? `https://media.themoviedb.org/t/p/w300_and_h450_bestv2${actor.profile_path}` : '';
          let character = actor.character || '';

          if (
            !character &&
            Array.isArray(actor.roles) &&
            actor.roles.length > 0
          ) {
            character = actor.roles.map(r => r.character).filter(Boolean).join(' / ');
          }

          if (!character && (actor.role || actor.roles?.[0]?.role)) {
            character = actor.role || actor.roles[0].role;
          }

          return {
            id: actor.id || '',
            name: actor.name,
            original_name: actor.original_name,
            character: character || '',
            image,
          };
        })
        .slice(0, 15);
    }
  }

  data.imdb_id = tmdb_data.external_ids?.imdb_id || '';
  data.imdb_link = data.imdb_id ? `https://www.imdb.com/title/${data.imdb_id}/` : '';
  data.success = true;

  return data;
};

/**
 * 从 TMDB 获取媒体信息并生成标准化数据
 * @param {string|number} sid - TMDB 媒体标识符，支持格式: 'movie/12345', 'tv/12345' 或纯数字ID
 * @param {Object} env - 环境变量对象，必须包含 TMDB_API_KEY
 * @returns {Promise<Object>} 标准化后的媒体信息对象或错误信息
 */
const gen_tmdb = async (sid, env) => {
  try {
    const TMDB_API_KEY = env?.TMDB_API_KEY;
    if (!TMDB_API_KEY) {
      return Object.assign(base, { error: "TMDB API key not configured" });
    }

    const parsed = parseSid(sid);
    if (!parsed) {
      return Object.assign(base, { error: "Invalid TMDB ID format. Expected 'movie/12345', 'tv/12345' or numeric ID" });
    }

    let { media_type, media_id } = parsed;
    if (!media_type || !media_id) {
      return Object.assign(base, { error: "Invalid TMDB ID format" });
    }
    const base = { site: "tmdb", sid: media_id };
    const params = `api_key=${encodeURIComponent(TMDB_API_KEY)}&language=zh-CN&append_to_response=credits,release_dates,external_ids`;
    const url = `${TMDB_API_URL}/${encodeURIComponent(media_type)}/${encodeURIComponent(media_id)}?${params}`;
    console.log("TMDB request:", url);

    let resp;
    try {
      resp = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json',
          'Accept-Language': 'zh-CN,zh;q=0.9'
        }
      }, DEFAULT_TIMEOUT);
    } catch (fetch_error) {
      console.error("TMDB fetch error:", fetch_error);
      return Object.assign(base, {
        error: `TMDB API fetch error: ${fetch_error.name === 'AbortError' ? 'Request timeout' : fetch_error.message}`
      });
    }

    if (!resp.ok) {
      const status = resp.status;
      let text = '';
      try { 
        text = await resp.text(); 
      } catch (_) { 
        /* ignore */ 
      }
      
      console.warn("TMDB API non-ok response:", status, text && text.slice(0, 200));

      if (status === 404) return Object.assign(base, { error: NONE_EXIST_ERROR });
      if (status === 401) return Object.assign(base, { error: "TMDB API key invalid" });
      if (status === 429) return Object.assign(base, { error: "TMDB API rate limit exceeded" });
      return Object.assign(base, { error: `TMDB API request failed with status ${status}` });
    }

    let tmdb_data;
    try {
      tmdb_data = await resp.json();
      if (tmdb_data.overview === '') {
        const translationsUrl = `${TMDB_API_URL}/${encodeURIComponent(media_type)}/${encodeURIComponent(media_id)}/translations?api_key=${encodeURIComponent(TMDB_API_KEY)}`;
        const translationsResp = await fetchWithTimeout(translationsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'application/json',
            'Accept-Language': 'zh-CN,zh;q=0.9'
          }
        }, DEFAULT_TIMEOUT);

        if (translationsResp.ok) {
          const translationsData = await translationsResp.json();
          
          // 优先级顺序: CN > HK > TW > US (基于 iso_3166_1)
          const priorityOrder = ['CN', 'HK', 'TW', 'US'];
          let translationToUse = null;
          
          // 首先按地区优先级查找中文翻译
          for (const region of priorityOrder) {
            const translation = translationsData.translations.find(t => 
              t.iso_3166_1 === region && 
              t.iso_639_1 === 'zh' && 
              t.data && 
              t.data.overview
            );
            
            if (translation) {
              translationToUse = translation;
              break;
            }
          }
          
          // 如果没找到指定地区的中文翻译，查找任何中文翻译
          if (!translationToUse) {
            translationToUse = translationsData.translations.find(t => 
              t.iso_639_1 === 'zh' && 
              t.data && 
              t.data.overview
            );
          }
          
          // 如果还没找到，查找任何包含overview的翻译(包括英文)
          if (!translationToUse) {
            translationToUse = translationsData.translations.find(t => 
              t.data && 
              t.data.overview
            );
          }

          if (translationToUse) {
            tmdb_data.overview = translationToUse.data.overview;
          }
        }
      }
    } catch (json_error) {
      console.error("TMDB JSON parse error:", json_error);
      return Object.assign(base, { error: "TMDB API response parsing failed" });
    }

    const result = buildResult(tmdb_data, media_type);
    console.log("TMDB data generated for:", result.title);

    return { ...base, ...result };
  } catch (error) {
    console.error("TMDB processing error:", error);
    return Object.assign(base, { error: `TMDB API processing error: ${error?.message || error}` });
  }
};

const MELOON_ALBUM_INFO_URL = "https://www.melon.com/album/detail.htm";
const translations = {
  '발라드': 'Ballad',
  '댄스': 'Dance',
  '랩/힙합': 'Rap / Hip-Hop',
  'R&B/Soul': 'R&B / Soul',
  '인디음악': 'Indie',
  '록/메탈': 'Rock / Metal',
  '트로트': 'Trot',
  '포크/블루스': 'Folk / Blues',
  '재즈': 'Jazz',
  '애시드/퓨전/팝': 'Acid / Fusion / Pop',
};
/**
 * 安全获取元素文本内容
 * @param {Object} $el - Cheerio元素对象
 * @returns {string} 元素的文本内容，如果元素不存在则返回空字符串
 */
const safeText = ($el) => {
  try {
    return $el && $el.length ? $el.text().trim() : "";
  } catch {
    return "";
  }
};

/**
 * 处理海报 URL（去除额外参数、提高分辨率、补全域名）
 * @param {string} src - 原始图片 URL
 * @returns {string|null} 处理后的高质量图片 URL，如果输入为空则返回 null
 */
const normalizePoster = (src) => {
  const HTTP_REGEX = /^https?:\/\//i;
  if (!src) return null;
  let url = String(src).split('?')[0];
  const jpgIndex = url.indexOf('.jpg');
  if (jpgIndex !== -1) url = url.substring(0, jpgIndex + 4);
  url = url.replace(/500\.jpg$/, '1000.jpg');

  if (!HTTP_REGEX.test(url)) {
    url = `https://www.melon.com${url.startsWith('/') ? '' : '/'}${url}`;
  }
  
  return url;
};

/**
 * 翻译流派数组中的每个元素
 * @param {Array} genres - 需要翻译的流派数组
 * @returns {Array} 翻译后的流派数组，如果输入不是数组则返回空数组
 */
const translateGenres = (genres) => {
  if (!Array.isArray(genres)) {
    return [];
  }
  
  return genres.map(genre => {
    // 处理 undefined 或 null 的情况
    if (genre == null) {
      return genre;
    }
    return translations[genre] || genre;
  });
};

/**
 * 获取随机 User-Agent 字符串，用于模拟不同浏览器的请求头
 * @returns {string} 随机选择的一个 User-Agent 字符串
 */
const getRandomUserAgent = () => {
  const browsers = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
  ];
  return browsers[Math.floor(Math.random() * browsers.length)];
};

/**
 * 获取专辑信息
 * @param {string} albumId - 专辑ID
 * @returns {Promise<object>} 专辑信息对象
 */
const fetchAlbumInfo = async (albumId) => {
  const encodedAlbumId = encodeURIComponent(albumId);
  const data = { site: "melon", sid: albumId };

  try {
    const melon_url = `${MELOON_ALBUM_INFO_URL}?albumId=${encodedAlbumId}`;
    const resp = await fetchWithTimeout(melon_url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      }
    });

    if (!resp.ok) {
      if (resp.status === 404) return Object.assign(data, { error: NONE_EXIST_ERROR });
      throw new Error(`请求失败，状态码 ${resp.status}`);
    }

    const html = await resp.text();
    const $ = typeof page_parser$1 === 'function' ? page_parser$1(html) : null;
    if (!$) throw new Error("缺少 HTML 解析器");

    const $info = $('.wrap_info');
    if (!$info || $info.length === 0) {
      return Object.assign(data, { error: "未找到专辑信息容器" });
    }

    data.melon_id = encodedAlbumId;
    data.melon_link = melon_url;

    const typeElem = $info.find('.gubun').first();
    let koreanType = safeText(typeElem);
    const typeMatch = koreanType.match(/\[(.*?)\]/);
    if (typeMatch) {
      const rawType = typeMatch[1];
      const typeTranslations = {
        '정규': '正规专辑',
        '싱글': '单曲',
        'EP': '迷你专辑',
        'OST': '原声带',
      };
      data.album_type = typeTranslations[rawType] || rawType;
    } else {
      const cleanType = koreanType.replace(/[[\]]/g, '').trim();
      if (cleanType) {
        data.album_type = cleanType;
      }
    }

    const titleElem = $info.find('.song_name').first();
    let title = safeText(titleElem).replace(/^앨범명\s*/i, '').trim();
    if (title) data.title = title;

    const artistElems = $info.find('.artist a[href*="goArtistDetail"]');
    if (artistElems && artistElems.length) {
      const artists = [...new Set(artistElems.map((_, el) => $(el).text().trim()))].filter(Boolean);
      if (artists.length) data.artists = artists;
    }

    const $infoWrapper = $info;
    const date_elem = $infoWrapper.find('.meta dl:nth-child(1) dd').first();
    if (date_elem && date_elem.length > 0) {
      data.release_date = date_elem.text().trim();
    }

    const genre_elem = $infoWrapper.find('.meta dl:nth-child(2) dd').first();
    if (genre_elem && genre_elem.length > 0) {
      const rawGenres = genre_elem.text().trim()
        .split(',')
        .map(g => g.trim())
        .filter(Boolean);
      data.genres = translateGenres(rawGenres);
    }

    const publisher_elem = $infoWrapper.find('.meta dl:nth-child(3) dd').first();
    if (publisher_elem && publisher_elem.length > 0) {
      data.publisher = publisher_elem.text().trim();
    }

    let meta_items = $infoWrapper.find('.meta dl.list dt');
    if (!meta_items || meta_items.length === 0) {
      meta_items = $infoWrapper.find('.meta dl dt');
    }
    meta_items.each(function () {
      const $dt = $(this);
      const label = $dt.text().trim();
      const $dd = $dt.next('dd');
      const value = $dd.text().trim();

      switch (label) {
        case '발매일':
          if (value) data.release_date = value;
          break;
        case '장르':
          if (value) {
            const rawGenres = value.split(',').map(g => g.trim()).filter(Boolean);
            data.genres = translateGenres(rawGenres);
          }
          break;
        case '발매사':
          if (value) data.publisher = value;
          break;
        case '기획사':
          if (value) data.planning = value;
          break;
        case '유형':
          if (value) data.album_type = value;
          break;
      }
    });

    const posterElem = $info.find('.thumb img').first();
    if (posterElem && posterElem.length) {
      const src = posterElem.attr('src') || posterElem.attr('data-src') || '';
      const poster = normalizePoster(src);
      if (poster) data.poster = poster;
    }

    const albumInfo = $('.dtl_albuminfo').first();
    if (albumInfo && albumInfo.length) {
      const raw = albumInfo.html() || "";
      data.description = raw.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
    }

    let rows = $('#frm .tbl_song_list tbody tr');
    if (!rows || rows.length === 0) rows = $('.tbl_song_list tbody tr');
    if (!rows || rows.length === 0) rows = $('table:has(caption:contains("곡 리스트")) tbody tr');

    if (rows && rows.length) {
      const tracks = [];
      rows.each(function () {
        const $row = $(this);
        const number = safeText($row.find('.rank')).replace(/\D+/g, '') || safeText($row.find('.no'));

        let t = extractTrackTitle($row);

        if (!t) return;

        const artLinks = $row.find('a[href*="goArtistDetail"]');
        const trackArtists = [...new Set(artLinks.map((_, el) => $(el).text().trim()))].filter(Boolean);

        tracks.push({ number: number || '', title: t, artists: trackArtists });
      });

      if (tracks.length) data.tracks = tracks;
    }

    data.success = true;
    return data;
  } catch (err) {
    console.error("Melon 专辑处理错误:", err);
    return Object.assign(data, { error: `Melon 专辑处理错误: ${err && err.message ? err.message : String(err)}` });
  }
};

/**
 * 提取歌曲标题
 * @param {Object} $row - 表格行的jQuery/Cheerio对象
 * @returns {string} 提取到的歌曲标题，如果未找到则返回空字符串
 */
const extractTrackTitle = ($row) => {
  let t = '';

  const aPlay = $row.find('a[title*="재생"]').first();
  if (aPlay && aPlay.length) t = safeText(aPlay);

  if (!t) {
    const aInfo = $row.find('a[title*="곡정보"]').first();
    if (aInfo && aInfo.length) {
      const titleAttr = aInfo.attr('title') || '';
      const m = titleAttr.match(/^(.*?)\s+(재생|곡정보)/);
      if (m && m[1]) t = m[1].trim();
      else {
        const candidate = aInfo.closest('.ellipsis').find('a').first();
        t = safeText(candidate);
      }
    }
  }

  if (!t) {
    t = safeText($row.find('.ellipsis a').first()) || safeText($row.find('.song_name').first());
  }

  return t;
};

/**
 * 生成Melon专辑信息
 * @param {string} sid - 专辑ID (格式如 "album/123456")
 * @returns {Promise<object>} 专辑信息对象
 */
const gen_melon = async (sid) => {
  const data = { site: "melon", sid };

  try {
    console.log("Melon request for sid:", sid);

    const parts = String(sid || "").split("/");
    const media_type = parts[0];
    const media_id = parts[1];

    if (media_type !== "album" || !/^\d+$/.test(media_id)) {
      return Object.assign(data, { error: "Invalid Melon ID format. Expected 'album/<digits>'" });
    }

    return await fetchAlbumInfo(media_id);
  } catch (err) {
    console.error("Melon processing error:", err);
    return Object.assign(data, { error: `Melon processing error: ${err && err.message ? err.message : String(err)}` });
  }
};

const STEAM_APP_DETAILS_URL = "https://store.steampowered.com/api/appdetails";
const MAX_SCREENSHOTS = 3;
const isNumericString = s => typeof s === 'string' && /^\d+$/.test(s);
const formatPrice = p => {
  if (!p || typeof p !== 'object') return null;
  const currency = p.currency || '';
  const initial = typeof p.initial === 'number' ? (p.initial / 100).toFixed(2) : null;
  const final = typeof p.final === 'number' ? (p.final / 100).toFixed(2) : null;
  const discount = p.discount_percent || 0;
  return { currency, initial, final, discount };
};

/**
 * 异步生成指定Steam游戏ID对应的游戏信息数据
 * @param {string|number} sid - Steam游戏的唯一标识符（AppID）
 * @returns {Promise<object>} 返回一个包含Steam游戏数据的对象，包括基本信息、价格、系统需求等，
 *                           若发生错误则返回带有error字段的失败信息
 */
const gen_steam = async (sid, env) => {
  const data = { site: 'steam', sid: sid };

  try {
    if (!sid || (!isNumericString(String(sid)))) {
      return Object.assign(data, { error: "Invalid Steam ID format. Expected numeric appid" });
    }
    const appid = String(sid);

    if (env.ENABLED_CACHE === 'false') {
      const cachedData = await getStaticMediaDataFromOurBits('steam', appid);
      if (cachedData) {
        console.log(`[Cache Hit] GitHub OurBits DB For steam ${appid}`);
        return { ...data, ...cachedData, success: true };
      }
    }
    

    const steam_api_url = `${STEAM_APP_DETAILS_URL}?appids=${encodeURIComponent(appid)}&l=cn`;
    let steam_response;
    try {
      steam_response = await fetchWithTimeout(steam_api_url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json',
          'Accept-Language': 'zh-CN,zh;q=0.9'
        }
      }, DEFAULT_TIMEOUT);
    } catch (err) {
      return Object.assign(data, { error: `Steam API fetch error: ${err?.name === 'AbortError' ? 'Request timeout' : err?.message || err}` });
    }

    if (!steam_response || !steam_response.ok) {
      const status = steam_response ? steam_response.status : 'no response';
      return Object.assign(data, { error: `Steam API request failed with status ${status}` });
    }

    let steam_data;
    try {
      steam_data = await steam_response.json();
    } catch (err) {
      return Object.assign(data, { error: "Failed to parse Steam API response" });
    }

    const entry = safe(steam_data[appid], {});
    if (!entry.success) {
      return Object.assign(data, { error: "Failed to retrieve Steam app details" });
    }

    const app_data = safe(entry.data, {});
    data.name = safe(app_data.name, "N/A");
    data.type = safe(app_data.type, "N/A");
    data.about_the_game = safe(app_data.about_the_game, "");
    data.header_image = safe(app_data.header_image, "");
    data.website = safe(app_data.website, "");
    data.developers = Array.isArray(app_data.developers) ? app_data.developers : [];
    data.publishers = Array.isArray(app_data.publishers) ? app_data.publishers : [];
    data.release_date = app_data.release_date ? safe(app_data.release_date.date, "N/A") : "N/A";
    data.coming_soon = !!(app_data.release_date && app_data.release_date.coming_soon);

    if (app_data.price_overview) {
      const p = formatPrice(app_data.price_overview);
      if (p) data.price = p;
    }

    data.supported_languages = safe(app_data.supported_languages, "");
    if (app_data.platforms) {
      data.platforms = {
        windows: !!app_data.platforms.windows,
        mac: !!app_data.platforms.mac,
        linux: !!app_data.platforms.linux
      };
    } else {
      data.platforms = { windows: false, mac: false, linux: false };
    }

    data.categories = Array.isArray(app_data.categories) ? app_data.categories.map(c => c.description) : [];
    data.genres = Array.isArray(app_data.genres) ? app_data.genres.map(g => g.description) : [];

    if (app_data.pc_requirements) {
      data.pc_requirements = {
        minimum: safe(app_data.pc_requirements.minimum, ""),
        recommended: safe(app_data.pc_requirements.recommended, "")
      };
    } else {
      data.pc_requirements = { minimum: "", recommended: "" };
    }

    if (Array.isArray(app_data.screenshots)) {
      data.screenshots = app_data.screenshots.slice(0, MAX_SCREENSHOTS).map(s => ({
        id: s.id,
        path_thumbnail: s.path_thumbnail,
        path_full: s.path_full
      }));
    } else {
      data.screenshots = [];
    }

    data.success = true;
    return data;
  } catch (error) {
    return Object.assign(data, { error: `Steam app processing error: ${error?.message || error}` });
  }
};

const BASE_URL = "https://novelquickapp.com";
async function gen_hongguo(sid) {
  if (typeof sid !== "string") {
    return { success: false, error: "Invalid input: sid must be a string" };
  }

  let url;

  // 判断 sid 是短链接还是长链接ID
  if (sid.startsWith("http")) {
    url = sid;
  } else if (sid.length > 15) {
    // 假设 series_id 比较长
    url = `${BASE_URL}/detail?series_id=${sid}`;
  } else {
    // 可能是短链的后缀，或者其他情况，这里假设是短链后缀
    url = `${BASE_URL}/s/${sid}/`;
  }

  try {
    const response = await fetchWithTimeout(url);
    const html = await response.text();
    const $ = page_parser$1(html);

    let routerDataText = null;

    $("script").each((i, el) => {
      const text = $(el).html();
      if (text && text.includes("window._ROUTER_DATA =")) {
        routerDataText = text;
        return false;
      }
    });

    let routerData;

    if (routerDataText) {
      const jsonStr = routerDataText
        .split("window._ROUTER_DATA =")[1]
        ?.trim()
        .replace(/;$/, "");
      if (jsonStr) {
        try {
          routerData = JSON.parse(jsonStr);
        } catch (e) {
          console.error(
            "Failed to parse extracted JSON, trying regex fallback"
          );
        }
      }
    }

    if (!routerData) {
      const match = html.match(/window\._ROUTER_DATA\s*=\s*({.*?});/s);
      if (match && match[1]) {
        try {
          routerData = JSON.parse(match[1]);
        } catch (e) {
          console.error("Failed to parse regex matched JSON");
        }
      }
    }

    if (!routerData) {
      throw new Error("Failed to extract _ROUTER_DATA from Hongguo page");
    }

    const videoDetailData =
      routerData?.loaderData?.["video-detail-share_page"]?.pageData
        ?.video_detail_data;
    const seriesDetail = routerData?.loaderData?.detail_page?.seriesDetail;

    let title, episodes, actors, genres, synopsis, poster_url;

    if (videoDetailData) {
      ({
        title,
        episodes,
        actors = [],
        genres = [],
        synopsis,
        poster_url,
      } = videoDetailData);
      episodes = videoDetailData.series_episode_info?.episode_cnt ?? episodes;
    } else if (seriesDetail) {
      ({
        series_name: title,
        episode_cnt: episodes,
        celebrities: actors = [],
        tags: genres = [],
        series_intro: synopsis,
        series_cover: poster_url,
      } = seriesDetail);
    } else {
      throw new Error(
        "Failed to find video data in Hongguo page data (checked both formats)"
      );
    }

    return {
      success: true,
      site: "hongguo",
      sid: sid,
      chinese_title: title,
      episodes: episodes,
      actors: actors,
      genres: genres,
      synopsis: synopsis,
      poster_url: poster_url,
    };
  } catch (error) {
    console.error("Error fetching Hongguo data:", error);
    return { success: false, error: error.message };
  }
}

const HEADERS_BASE = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
};

const buildHeaders = (env = {}) => {
  const headers = { ...HEADERS_BASE };
  if (env?.QQ_COOKIE) {
    headers.Cookie = env.QQ_COOKIE;
  }
  return headers;
};

/**
 * 获取QQ音乐专辑信息
 * @param {string} sid - QQ音乐专辑ID
 * @param {Object} env - 环境变量
 * @returns {Promise<Object>} 专辑信息对象
 */
async function gen_qq_music(sid, env) {
  try {
    if (!env?.QQ_COOKIE) {
      return {
        success: false,
        error: "未提供QQ音乐Cookie,不能使用此功能！请联系管理员。",
      };
    }

    const headers = buildHeaders(env);
    const url = `https://y.qq.com/n/ryqq/albumDetail/${sid}`;

    const response = await fetchWithTimeout(url, { headers });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error! status: ${response.status}`,
      };
    }

    const html = await response.text();

    if (!html || typeof html !== "string") {
      return {
        success: false,
        error: "获取到的页面内容无效",
      };
    }

    const $ = page_parser$1(html);

    let initialDataScript = null;
    try {
      $("script").each((i, el) => {
        const text = $(el).html();
        if (text && text.includes("window.__INITIAL_DATA__")) {
          initialDataScript = text;
          return false;
        }
      });
    } catch (domError) {
      return {
        success: false,
        error: "解析页面DOM时出错: " + domError.message,
      };
    }

    if (!initialDataScript) {
      return {
        success: false,
        error:
          "使用的COOKIE可能已过期,请检查COOKIE是否正确或页面结构是否发生变化",
      };
    }

    let dataMatch;
    try {
      dataMatch = initialDataScript.match(
        /window\.(__INITIAL_DATA__)\s*=\s*(\{[^<]*\})/
      );
    } catch (regexError) {
      return {
        success: false,
        error: "正则表达式匹配出错: " + regexError.message,
      };
    }

    if (!dataMatch || !dataMatch[2]) {
      return {
        success: false,
        error: "无法从页面脚本中提取初始数据",
      };
    }

    let initData;
    try {
      let jsonString = dataMatch[2];
      jsonString = jsonString.replace(/:undefined/g, ":null");
      initData = JSON.parse(jsonString);
    } catch (parseError) {
      return {
        success: false,
        error: "解析页面初始数据失败: " + parseError.message,
      };
    }

    if (!initData.detail) {
      return {
        success: false,
        error: "返回数据中缺少详情信息",
      };
    }

    const detail = initData.detail || {};
    const songList = initData.songList || [];

    // 处理专辑封面URL，将任意尺寸替换为500x500
    let coverUrl = "";
    if (detail.picurl) {
      coverUrl = `https:${detail.picurl}`;
      coverUrl = coverUrl.replace(/T002R\d+x\d+M000/, "T002R500x500M000");
    }

    const data = {
      id: detail.id,
      mid: detail.albumMid,
      name: detail.title,
      cover: coverUrl,
      singer: detail.singer || [],
      albumName: detail.albumName,
      genre: detail.genre,
      language: detail.language,
      albumType: detail.albumType,
      company: detail.company,
      publishTime: detail.ctime,
      desc: detail.desc,
      songList: songList.map((song) => ({
        id: song.id,
        mid: song.mid,
        name: song.title,
        sub_name: song.subtitle || "",
        singer: song.singer || [],
        interval: song.interval,
        playTime: song.playTime,
      })),
    };

    return {
      success: true,
      site: "qq_music",
      sid: sid,
      ...data,
    };
  } catch (error) {
    console.error("获取QQ音乐专辑信息失败:", error);
    return {
      success: false,
      error: "获取QQ音乐专辑信息失败: " + error.message,
    };
  }
}

/**
 * 根据给定的选择器从 DOM 中提取字段文本内容。
 * 
 * 此函数尝试以多种方式获取与标签关联的文本或链接内容：
 * - 首先查找标签后紧邻的文本节点或链接；
 * - 若未找到，则查找同级或父级中的链接；
 * - 最后回退到处理纯文本和清理格式。
 *
 * @param {Function} $ - Cheerio 实例，用于操作 DOM。
 * @param {string} selector - 用于定位标签元素的选择器字符串。
 * @returns {string} 提取到的字段文本内容，若失败则返回空字符串。
 */
const fetchFieldText = ($, selector) => {
  try {
    const $label = $(selector);
    if (!$label.length) return '';
    
    const $parent = $label.parent();
    if (!$parent.length) return '';

    if ($label[0].nextSibling && $label[0].nextSibling.nodeType === 3) {
      const nextText = $label[0].nextSibling.nodeValue?.trim();
      if (nextText === '' && $label[0].nextSibling.nextSibling) {
        const nextElement = $($label[0].nextSibling.nextSibling);
        if (nextElement.is('a')) {
          return nextElement.text().trim();
        }
      }
    }
    
    const $links = $label.siblings('a');
    if ($links.length > 0) {
      const texts = [];
      $links.each((_, element) => {
        const text = $(element).text().trim();
        if (text) texts.push(text);
      });
      return texts.join(' / ');
    }
    
    const $allLinks = $parent.find('a');
    if ($allLinks.length > 0) {
      const texts = [];
      $allLinks.each((_, element) => {
        const text = $(element).text().trim();
        if (text) texts.push(text);
      });
      return texts.join(' / ');
    }
    
    const nextSibling = $label[0].nextSibling;
    if (nextSibling && nextSibling.nodeType === 3) {
      let text = nextSibling.nodeValue?.trim();
      text = text?.replace(/^[:：\s]*/, '').trim();
      if (text) return text;
    }
    
    let fullText = $parent.text().replace(/\s+/g, ' ').trim();
    const labelText = $label.text().trim();
    if (labelText && fullText) {
      fullText = fullText.replace(new RegExp(`${labelText}\\s*[:：]?\\s*`, 'i'), '').trim();
    }
    return fullText || '';
    
  } catch (error) {
    console.warn(`Error fetching field with selector ${selector}:`, error);
    return '';
  }
};

/**
 * 提取页面介绍内容的函数
 * @param {Function} $ - cheerio 实例
 * @returns {string} 返回清理后的介绍文本内容，如果没有找到内容则返回空字符串
 */
const extractIntroduction = ($) => {
  const $intro = $('#link-report > span.all.hidden').length 
    ? $('#link-report > span.all.hidden')
    : $('#link-report .intro');
    
  if (!$intro.length) return '';
  
  const $clone = $intro.clone();
  $clone.find('style').remove();

  return $clone.text().trim();
};
/**
 * 解析数值字符串或数字，返回对应的数值
 * @param {string|number} value - 需要解析的值，可以是字符串或数字
 * @param {Function} parser - 解析函数，默认使用parseInt
 * @returns {number} 解析后的数值，如果解析失败则返回0
 */
const parseNumber = (value, parser = parseInt) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = parser(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

/**
 * 提取图书信息字段的函数
 * @param {Object} $ - cheerio 实例
 * @param {Object} ldJson - JSON-LD数据对象，包含结构化数据
 * @returns {Object} 包含提取的图书信息的对象
 */
const extractBookFields = ($, ldJson) => {
  const getField = (selector) => fetchFieldText($, selector);
  const getAnchor = (selector) => fetchAnchorText($(selector));
  
  const translatorText = getField('#info span.pl:contains("译者")');
  
  return {
    translator: translatorText
      ? translatorText.split(' / ').map(s => s.trim()).filter(Boolean).sort()
      : [],
    series: getField('#info span.pl:contains("丛书")'),
    original_title: getAnchor('#info span.pl:contains("原作名")'),
    publisher: getField('#info span.pl:contains("出版社")'),
    year: getAnchor('#info span.pl:contains("出版年")'),
    pages: getAnchor('#info span.pl:contains("页数")'),
    pricing: getAnchor('#info span.pl:contains("定价")'),
    binding: getAnchor('#info span.pl:contains("装帧")'),
    isbn: ldJson?.isbn || '',
  };
};

/**
 * 异步获取豆瓣书籍信息并解析返回结构化数据
 * 
 * @param {string} sid - 豆瓣书籍的唯一标识符（subject id）
 * @param {object} env - 环境配置对象，用于构建请求头等操作
 * @returns {Promise<object>} 返回包含书籍信息的对象
 */
const gen_douban_book = async (sid, env) => {
  const data = { site: 'douban_book', sid };
  
  if (!sid) {
    return { ...data, error: 'Invalid Douban Book id' };
  }
  
  const baseLink = `https://book.douban.com/subject/${encodeURIComponent(sid)}/`;
  
  try {
    const headers = buildHeaders$1(env);
    const response = await fetchWithTimeout(baseLink, { headers });
    
    if (!response) {
      return { ...data, error: 'No response from Douban Book' };
    }
    
    if (response.status === 404) {
      return { ...data, error: NONE_EXIST_ERROR };
    }
    
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        ...data,
        error: isAntiBot(text)
          ? ANTI_BOT_ERROR
          : `Failed to fetch: ${response.status} ${text.slice(0, 200)}`,
      };
    }
    
    const html = await response.text();
    
    if (NOT_FOUND_PATTERN.test(html)) {
      return { ...data, error: NONE_EXIST_ERROR };
    }
    
    if (isAntiBot(html)) {
      return { ...data, error: ANTI_BOT_ERROR };
    }
    
    const $ = page_parser$1(html);
    const ldJson = parseJsonLd($);
    const title = ldJson?.name || $('span[property="v:itemreviewed"]').text().trim();
    const cover = $('#mainpic a.nbg').attr('href');
    const rating = parseNumber($('.rating_self strong[property="v:average"]').text().trim(), parseFloat);
    const votes = parseNumber($('.rating_self span[property="v:votes"]').text().trim());
    const introduction = extractIntroduction($);
    const author = ldJson?.author?.map(a => a.name).sort() || [];
    const fields = extractBookFields($, ldJson);
    
    return {
      ...data,
      ...fields,
      title,
      poster: cover,
      author,
      rating,
      votes,
      introduction,
      link: baseLink,
      success: true,
    };
    
  } catch (error) {
    console.error('Error fetching Douban book:', error);
    return { 
      ...data, 
      error: `Failed to fetch book data: ${error.message || 'Unknown error'}` 
    };
  }
};

const TIME_WINDOW = 60000; // 1分钟
const MAX_REQUESTS = 30; // 每分钟最多30个请求
const CLEANUP_INTERVAL = 10000; // 10秒清理一次过期记录
const requestCounts = new Map();

const IMDB_CONSTANTS = {
  SUGGESTION_API_URL: "https://v2.sg.media-imdb.com/suggestion/h/",
  FIND_URL: "https://www.imdb.com/find",
  BASE_URL: "https://www.imdb.com",
  SEARCH_HEADERS: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
  },
  MAX_RESULTS: 10,
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "false",
};

const URL_PROVIDERS = [
  {
    name: "douban",
    domains: ["movie.douban.com"],
    regex: /\/subject\/(\d+)/,
    generator: gen_douban,
    formatter: (data) => generateDoubanFormat(data),
  },
  {
    name: "douban_book",
    domains: ["book.douban.com"],
    regex: /\/subject\/(\d+)/,
    generator: gen_douban_book,
    formatter: (data) => generateDoubanBookFormat(data),
  },
  {
    name: "imdb",
    domains: ["www.imdb.com"],
    regex: /\/title\/(tt\d+)/,
    generator: gen_imdb,
    formatter: (data, env) =>
      env.ENABLED_CACHE === "false"
        ? notCacheImdbFormat(data)
        : generateImdbFormat(data),
  },
  {
    name: "tmdb",
    domains: ["api.themoviedb.org", "www.themoviedb.org"],
    regex: /\/(movie|tv)\/(\d+)/,
    idFormatter: (match) => `${match[1]}/${match[2]}`,
    generator: gen_tmdb,
    formatter: (data) => generateTmdbFormat(data),
  },
  {
    name: "melon",
    domains: ["www.melon.com"],
    regex: /\/album\/detail\.htm\?albumId=(\d+)/,
    idFormatter: (match) => `album/${match[1]}`,
    generator: gen_melon,
    formatter: (data) => generateMelonFormat(data),
  },
  {
    name: "bangumi",
    domains: ["bgm.tv", "bangumi.tv"],
    regex: /\/subject\/(\d+)/,
    generator: gen_bangumi,
    formatter: (data, env) =>
      env.ENABLED_CACHE === "false"
        ? notCacheBangumiFormat(data)
        : generateBangumiFormat(data),
  },
  {
    name: "steam",
    domains: ["store.steampowered.com"],
    regex: /\/app\/(\d+)/,
    generator: gen_steam,
    formatter: (data, env) =>
      env.ENABLED_CACHE === "false"
        ? notCacheSteamFormat(data)
        : generateSteamFormat(data),
  },
  {
    name: "hongguo",
    domains: ["novelquickapp.com"],
    regex: /(?:s\/([A-Za-z0-9_-]+)|series_id=(\d+))/,
    idFormatter: (match) => match[1] || match[2],
    generator: gen_hongguo,
    formatter: (data) => generateHongguoFormat(data),
  },
  {
    name: "qq_music",
    domains: ["y.qq.com"],
    regex: /\/albumDetail\/([A-Za-z0-9]+)/,
    generator: gen_qq_music,
    formatter: (data) => generateQQMusicFormat(data),
  },
];

const PROVIDER_CONFIG = {
  douban: {
    generator: gen_douban,
    formatter: (data) => generateDoubanFormat(data),
  },
  imdb: {
    generator: gen_imdb,
    formatter: (data, env) =>
      env.ENABLED_CACHE === "false"
        ? notCacheImdbFormat(data)
        : generateImdbFormat(data),
  },
  tmdb: { generator: gen_tmdb, formatter: (data) => generateTmdbFormat(data) },
  bangumi: {
    generator: gen_bangumi,
    formatter: (data, env) =>
      env.ENABLED_CACHE === "false"
        ? notCacheBangumiFormat(data)
        : generateBangumiFormat(data),
  },
  melon: {
    generator: gen_melon,
    formatter: (data) => generateMelonFormat(data),
  },
  steam: {
    generator: gen_steam,
    formatter: (data, env) =>
      env.ENABLED_CACHE === "false"
        ? notCacheSteamFormat(data)
        : generateSteamFormat(data),
  },
  hongguo: {
    generator: gen_hongguo,
    formatter: (data) => generateHongguoFormat(data),
  },
  qq_music: {
    generator: gen_qq_music,
    formatter: (data) => generateQQMusicFormat(data),
  },
  douban_book: {
    generator: gen_douban_book,
    formatter: (data) => generateDoubanBookFormat(data),
  }
};

const LINK_TEMPLATES = {
  douban: (id) => `https://movie.douban.com/subject/${id}/`,
  imdb: (id) => `https://www.imdb.com/title/${id}/`,
  tmdb: (item, id) => {
    const mediaType = item.media_type === "tv" ? "tv" : "movie";
    return `https://www.themoviedb.org/${mediaType}/${id}`;
  },
};

const SOURCE_PROCESSORS = {
  douban: (item) => ({
    year: pick(item, "year"),
    subtype: pick(item, "type") || "movie",
    title:
      item.data && Array.isArray(item.data) && item.data.length > 0
        ? pick(item.data[0], "name")
        : "",
    subtitle: String(
      item.data && Array.isArray(item.data) && item.data.length > 0
        ? pick(item.data[0], "description")
        : ""
    ),
    link: buildLink(item, "douban"),
    id: pick(item, "doubanId"),
    rating: String(pick(item, "doubanRating") || ""),
    img: pick(item, "img"),
    episode: pick(item, "episode"),
  }),
  imdb: (item) => ({
    year: pick(item, "y"),
    subtype: pick(item, "qid"),
    title: pick(item, "l"),
    subtitle: pick(item, "s"),
    link: item.id
      ? `https://www.imdb.com/title/${item.id}/`
      : buildLink(item, "imdb"),
    id: pick(item, "id"),
  }),
  tmdb: (item) => {
    // 加强标题逻辑：优先 "中文 (name) / 英文 (original_name 或 original_title)"
    const cnTitle = pick(item, "name", "title"); // 假设 name/title 为中文
    const enTitle = pick(item, "original_name", "original_title"); // 英文优先
    let title = "";
    if (cnTitle && enTitle && cnTitle !== enTitle) {
      title = `${cnTitle} / ${enTitle}`; // 双语格式
    } else if (cnTitle) {
      title = cnTitle;
    } else if (enTitle) {
      title = enTitle;
    }

    return {
      year: safeGetYearFromReleaseDate(item.release_date),
      subtype: item.media_type === "tv" ? "tv" : "movie",
      title: title,
      subtitle: truncate(pick(item, "overview"), 100),
      link: buildLink(item, "tmdb"),
      rating: item.vote_average != null ? String(item.vote_average) : "",
      id: pick(item, "id"),
    };
  },
};

const DEFAULT_FIELDS = (item, source) => ({
  year:
    pick(item, "year") ||
    pick(item, "y") ||
    safeGetYearFromReleaseDate(item.release_date) ||
    "",
  subtype:
    pick(item, "subtype") || pick(item, "type") || pick(item, "q") || "movie",
  title:
    pick(item, "title") || pick(item, "l") || pick(item.data, "name") || "",
  subtitle:
    pick(item, "subtitle") || pick(item, "s") || pick(item, "sub_title") || "",
  link: buildLink(item, source) || "",
  id: pick(item, "id"),
});

const ensureArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const safe = (v, fallback = "") =>
  v === undefined || v === null ? fallback : v;

let lastCleanup = Date.now();

/**
 * 检查请求频率是否超过限制 - 使用滑动窗口计数器算法
 * @param {string} clientIP - 客户端IP地址
 * @returns {Promise<boolean>} - 是否超过频率限制
 */
const isRateLimited = async (clientIP) => {
  const now = Date.now();
  const windowStart = now - TIME_WINDOW;

  if (now - lastCleanup > CLEANUP_INTERVAL) {
    for (const [ip, requests] of requestCounts.entries()) {
      const validRequests = requests.filter(
        (timestamp) => timestamp > windowStart
      );
      if (validRequests.length > 0) {
        requestCounts.set(ip, validRequests);
      } else {
        requestCounts.delete(ip);
      }
    }
    lastCleanup = now;
  }

  let validRequests = [];

  if (requestCounts.has(clientIP)) {
    const requests = requestCounts.get(clientIP);

    validRequests = requests.filter((timestamp) => timestamp > windowStart);

    if (validRequests.length >= MAX_REQUESTS) {
      return true; // 超过频率限制
    }

    validRequests.push(now);
    requestCounts.set(clientIP, validRequests);
  } else {
    requestCounts.set(clientIP, [now]);
  }

  return false;
};

/**
 * 格式化演员列表，将演员信息转换为一个以中文顿号（、）分隔的字符串。
 * 如果演员列表为空或无效，则返回默认值“未知”。
 *
 * @param {Array|Object|string} actors - 演员数据，可以是数组、对象或字符串。
 *   - 如果是数组，每个元素应包含演员信息（如 name_cn 或 name 属性）。
 *   - 如果是对象，直接提取其 name_cn 或 name 属性。
 *   - 如果是其他类型，会被 ensureArray 转换为数组。
 * @returns {string} - 格式化后的演员名称字符串，多个演员以“、”分隔。
 *   如果没有有效的演员名称，则返回“未知”。
 */
const formatActorList = (actors) => {
  return (
    ensureArray(actors)
      .map((a) => safe(a?.name_cn || a?.name))
      .filter(Boolean)
      .join("、") || "未知"
  );
};

/**
 * 从对象中选择第一个有效值
 * @param {any} item - 要从中选择值的对象
 * @param {...string} keys - 要检查的属性键列表
 * @returns {any} 返回找到的第一个有效值，如果没有找到则返回空字符串
 */
const pick = (item, ...keys) => {
  if (!item || typeof item !== "object") return "";
  for (const k of keys) {
    const v = item[k];
    if (v !== undefined && v !== null) {
      try {
        const strV = String(v);
        if (strV.trim() !== "") return v;
      } catch (e) {
        continue; // 忽略无法转换为字符串的值
      }
    }
  }
  return "";
};

/**
 * 截断字符串并在末尾添加省略号
 * @param {string|any} s - 要截断的字符串或可转换为字符串的值
 * @param {number} [n=100] - 截断长度，默认为100个字符
 * @returns {string} 截断后的字符串，如果输入无效则返回空字符串
 */
const truncate = (s, n = 100) => {
  if (!s || n <= 0) return "";
  let str = String(s).trim();
  return str.length > n ? str.slice(0, n).trim() + "..." : str;
};

/**
 * 构建链接的函数。
 *
 * @param {Object} item - 包含链接信息的对象。可以包含以下字段：
 *                        - link: 直接返回的链接字符串。
 *                        - url: 直接返回的链接字符串。
 *                        - id, imdb_id, douban_id, tt: 用于生成链接的标识符。
 * @param {string} source - 指定链接模板来源的字符串，用于从 LINK_TEMPLATES 中获取对应的模板。
 *
 * @returns {string} 返回生成的链接字符串。如果无法生成链接，则返回空字符串。
 */
const buildLink = (item, source) => {
  if (!item || typeof item !== "object") return "";
  if (item.link) return String(item.link);
  if (item.url) return String(item.url);

  const id = pick(item, "id", "imdb_id", "douban_id", "tt", "doubanId");
  if (!id) return "";

  const template = LINK_TEMPLATES[source];
  return template
    ? source === "tmdb"
      ? template(item, id)
      : template(id)
    : "";
};

/**
 * 安全地从日期字符串中提取年份。
 *
 * @param {string} dateStr - 表示日期的字符串，格式通常为 "YYYY-MM-DD"。
 *                           如果为空或不是字符串类型，则返回空字符串。
 * @returns {string} - 返回日期字符串中的年份部分（即 "YYYY"）。
 *                     如果输入无效或解析失败，则返回空字符串。
 */
const safeGetYearFromReleaseDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return "";
  try {
    return dateStr.split("-")[0] || "";
  } catch (err) {
    return "";
  }
};

/**
 * 异步函数：通过IMDB API执行搜索操作。
 *
 * @param {string} query - 搜索查询的关键字或短语。
 * @returns {Promise<Object|null>} - 返回处理后的搜索结果数据，如果搜索失败或无结果则返回null。
 *
 * 功能描述：
 * 1. 构造IMDB API的搜索URL，并对查询参数进行编码。
 * 2. 使用fetch发起HTTP请求，获取搜索结果。
 * 3. 如果响应状态不为成功（response.ok为false），记录警告日志并返回null。
 * 4. 解析返回的JSON数据，提取搜索结果列表。
 * 5. 如果结果列表不为空，调用processSearchResults函数处理结果并返回处理后的数据。
 * 6. 捕获任何请求或处理中的错误，记录错误日志并返回null。
 */
const _searchViaApi = async (query) => {
  const searchUrl = `${IMDB_CONSTANTS.SUGGESTION_API_URL}${encodeURIComponent(
    query
  )}.json`;
  try {
    const response = await fetch(searchUrl);
    if (!response.ok) {
      console.warn(`IMDB API search failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const results = data?.d ?? [];

    return results.length > 0
      ? processSearchResults(results, "imdb").data
      : null;
  } catch (error) {
    console.error(`IMDB API request failed for query "${query}":`, error);
    return null;
  }
};

/**
 * 提取结果信息。
 *
 * @param {jQuery} $el - 包含结果信息的元素。
 *                       该元素应包含一个带有 `.result_text` 类的子元素，
 *                       且该子元素中应包含一个链接 (`<a>` 标签)。
 *
 * @returns {Object|null} - 返回一个对象，包含以下字段：
 *   - year {string}: 提取的年份信息，如果没有找到则为空字符串。
 *   - subtype {string}: 固定值为 'feature'。
 *   - title {string}: 链接文本内容，表示标题。
 *   - subtitle {string}: 完整文本中去掉标题后的剩余部分。
 *   - link {string}: 构造的完整链接地址。
 *                     如果无法提取有效信息，则返回 null。
 */
const extractResult = ($el) => {
  const $resultText = $el.find(".result_text");
  const $link = $resultText.find("a");

  const linkHref = $link.attr("href");
  if (!linkHref || !linkHref.includes("/title/tt")) return null;

  const idMatch = linkHref.match(/\/title\/(tt\d+)/);
  if (!idMatch) return null;

  const title = $link.text().trim();
  const fullText = $resultText.text();
  const yearMatch = fullText.match(/\((\d{4})\)/);

  return {
    year: yearMatch ? yearMatch[1] : "",
    subtype: "feature",
    title: title,
    subtitle: fullText.replace(title, "").trim(),
    link: `${IMDB_CONSTANTS.BASE_URL}${linkHref}`,
  };
};

/**
 * 通过IMDb的网页抓取方式搜索影视内容。
 *
 * @param {string} query - 搜索关键词，用于构建IMDb的搜索URL。
 * @returns {Promise<Array>} - 返回一个Promise，解析为处理后的搜索结果数组。
 *                            如果抓取失败或没有结果，则返回空数组。
 */
const _searchViaScraping = async (query) => {
  const searchUrl = `${IMDB_CONSTANTS.FIND_URL}?q=${encodeURIComponent(
    query
  )}&s=tt`;
  console.debug("Trying IMDb fallback scraping URL:", searchUrl);

  try {
    const response = await fetch(searchUrl, {
      headers: IMDB_CONSTANTS.SEARCH_HEADERS,
    });
    if (!response.ok) {
      console.warn(`IMDb scrape failed: ${response.status}`);
      return [];
    }

    const html = await response.text();
    const $ = page_parser$1(html);
    const results = [];

    $(".findResult")
      .slice(0, IMDB_CONSTANTS.MAX_RESULTS)
      .each((i, el) => {
        const $el = $(el);
        const result = extractResult($el);
        if (result) results.push(result);
      });

    return processSearchResults(results, "imdb").data;
  } catch (error) {
    console.error(`IMDb scraping failed for query "${query}":`, error);
    return [];
  }
};

/**
 * 搜索IMDb的异步函数，通过API或网页抓取方式获取查询结果。
 *
 * @param {string} query - 要搜索的查询字符串（例如电影名称或演员名字）。
 * @returns {Promise<Object>} - 返回一个Promise，解析为包含以下字段的对象：
 *   - success (boolean): 搜索是否成功。
 *   - data (Array): 搜索结果数据（如果成功）。
 *   - error (string): 错误信息（如果失败）。
 */
const search_imdb = async (query) => {
  try {
    let searchData = await _searchViaApi(query);

    if (!searchData || searchData.length === 0) {
      console.debug(
        "API yielded no results, falling back to scraping for IMDb query:",
        query
      );
      searchData = await _searchViaScraping(query);
    }

    if (searchData?.length > 0) {
      return { success: true, data: searchData };
    }

    return {
      success: false,
      error: "未找到查询的结果 | No results found for the given query",
      data: [],
    };
  } catch (error) {
    return handleSearchError("IMDb", query, error);
  }
};

const search_douban = async (query) => {
  if (!query) {
    return { status: 400, success: false, error: "Invalid query", data: [] };
  }
  const SUGGESTION_API_URL = `https://api.wmdb.tv/api/v1/movie/search?q=${encodeURIComponent(
    query
  )}&skip=0&lang=Cn`;
  const response = await fetch(SUGGESTION_API_URL);
  if (!response.ok) {
    console.warn(`Douban API search failed: ${response.status}`);
    // 特别处理429状态码
    if (response.status === 429) {
      return {
        status: response.status,
        success: false,
        error:
          "请求过于频繁，请等待30秒后再试 | Too many requests, please wait 30 seconds and try again",
        data: [],
      };
    }
    return {
      status: response.status,
      success: false,
      error: "豆瓣API请求失败 | Douban API request failed",
      data: [],
    };
  }
  const data = await response.json();

  if (data.data.length > 0) {
    return {
      success: true,
      data: processSearchResults(data.data, "douban").data,
    };
  }
  return {
    status: 404,
    success: false,
    error: "未找到查询的结果 | No results found for the given query",
    data: [],
  };
};

/**
 * 构建用于搜索电影或电视节目的URL。
 *
 * @param {string} apiKey - 用于访问TMDb API的密钥。
 * @param {string} query - 搜索关键词，例如电影名称或电视节目名称。
 * @param {string} type - 搜索类型，通常为"movie"（电影）或"tv"（电视节目）。
 * @returns {string} 返回完整的搜索URL，包含API密钥、语言设置和编码后的查询参数。
 */
const buildSearchUrl = (apiKey, query, type) => {
  const base = `https://api.themoviedb.org/3/search/${type}`;
  return `${base}?api_key=${apiKey}&language=zh-CN&query=${encodeURIComponent(
    query
  )}`;
};

/**
 * 解析从 TMDB API 返回的响应数据。
 *
 * @param {Response} response - 从 TMDB API 获取的响应对象，通常是一个 Fetch API 的 Response 实例。
 *                              需要包含 `ok` 属性和 `json()` 方法。
 * @param {string} type - 数据的媒体类型（例如 "movie", "tv", "person" 等），用于标记解析后的数据。
 *
 * @returns {Promise<Array>} - 返回一个 Promise，解析后是一个数组，数组中的每个对象都包含原始数据，
 *                             并附加了一个 `media_type` 字段，值为传入的 `type` 参数。
 *                             如果响应失败或解析出错，则返回空数组。
 */
const parseResults = async (response, type) => {
  if (!response?.ok) {
    console.warn(`TMDB ${type} response failed: ${response?.status}`);
    return [];
  }

  try {
    const { results = [] } = await response.json();
    return results.map((item) => ({ ...item, media_type: type }));
  } catch (e) {
    console.warn(`TMDB ${type} parse failed:`, e?.message || e);
    return [];
  }
};

/**
 * 构建一个用于发起 HTTP 请求的选项对象。
 *
 * @param {AbortSignal} signal - 用于取消请求的信号对象，通常由 AbortController 提供。
 *                               如果需要支持请求取消功能，可以传入此参数。
 * @returns {Object} 返回一个包含 HTTP 请求配置的对象，具体包括：
 *                   - method: 请求方法，固定为 'GET'。
 *                   - headers: 请求头，包含一个模拟浏览器的 User-Agent 字段。
 *                   - signal: 传入的信号对象，用于请求取消。
 */
const buildRequestOptions = (signal) => ({
  method: "GET",
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  },
  signal,
});

/**
 * 搜索TMDb以获取与查询相关的电影和电视剧信息。
 *
 * @param {string} query - 搜索关键字，用于在TMDb中查找相关电影和电视剧。
 * @param {Object} env - 环境变量对象，包含TMDb API密钥等配置信息。
 *                       预期结构：{ TMDB_API_KEY: 'your_api_key_here' }
 * @returns {Object} - 返回一个对象，包含以下字段：
 *   - success {boolean}: 表示搜索是否成功。
 *   - error {string}: 如果失败，包含错误信息（可选）。
 *   - data {Array}: 搜索结果数据，按流行度排序并限制为最多10条记录。
 */
const search_tmdb = async (query, env) => {
  try {
    const apiKey = env?.TMDB_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "TMDB API密钥未配置 | TMDB API key not configured",
        data: [],
      };
    }

    const q = String(query || "").trim();
    if (!q) {
      return { success: false, error: "Invalid query", data: [] };
    }

    const movieUrl = buildSearchUrl(apiKey, q, "movie");
    const tvUrl = buildSearchUrl(apiKey, q, "tv");
    const TIMEOUT = 8000;
    const controller =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), TIMEOUT)
      : null;

    let movieResponse, tvResponse;
    try {
      [movieResponse, tvResponse] = await Promise.all([
        fetch(movieUrl, buildRequestOptions(controller?.signal)),
        fetch(tvUrl, buildRequestOptions(controller?.signal)),
      ]);
    } catch (fetchError) {
      if (fetchError?.name === "AbortError") {
        return {
          success: false,
          error: "TMDB API请求超时 | TMDB API request timeout",
          data: [],
        };
      }
      return {
        success: false,
        error: `TMDB API网络错误: ${fetchError?.message || "Unknown error"}`,
        data: [],
      };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    const [movieResults, tvResults] = await Promise.all([
      parseResults(movieResponse, "movie"),
      parseResults(tvResponse, "tv"),
    ]);

    const results = [...movieResults, ...tvResults]
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 10);

    if (results.length > 0) {
      return {
        success: true,
        data: processSearchResults(results, "tmdb").data,
      };
    }

    return {
      success: false,
      error: "未找到查询的结果 | No results found for the given query",
      data: [],
    };
  } catch (error) {
    console.error(`TMDB search failed for query "${query}":`, error);
    return handleSearchError("TMDb", query, error);
  }
};

/**
 * 处理IMDb搜索请求的异步函数。
 *
 * @param {string} query - 搜索的关键字或查询字符串，用于在IMDb中进行搜索。
 * @param {Object} env - 环境对象，通常包含与响应生成相关的配置或上下文信息。
 * @returns {Promise<Object>} 返回一个JSON格式的响应对象，包含以下字段：
 *  - success: 布尔值，表示搜索是否成功。
 *  - data: 如果成功，包含搜索结果的数组；如果失败，则为空数组。
 *  - site: 如果成功，固定为"search-imdb"。
 *  - error: 如果失败，包含错误信息（优先级：result.error > result.message > 默认错误信息）。
 */
const handleImdbSearch = async (query, env) => {
  const result = await search_imdb(query);
  const success = result.success && result.data && result.data.length > 0;
  const response = {
    success,
    ...(success
      ? { data: result.data, site: "search-imdb" }
      : {
          error: result.error || result.message || "IMDb搜索未找到相关结果",
          data: [],
        }),
  };
  return makeJsonResponse(response, env);
};

/**
 * 处理TMDB搜索请求的异步函数。
 *
 * @param {string} query - 搜索的关键字或查询条件，用于传递给TMDB搜索接口。
 * @param {Object} env - 环境配置对象，包含与TMDB API交互所需的环境变量或配置。
 * @returns {Promise<Object>} 返回一个JSON格式的响应对象，包含以下字段：
 *  - success: 布尔值，表示搜索是否成功。
 *  - data: 如果成功，包含搜索结果的数据数组；如果失败，则为空数组。
 *  - error: 如果失败，包含错误信息（仅在success为false时存在）。
 *  - site: 如果成功，固定为"search-tmdb"，标识数据来源。
 */
const handleTmdbSearch = async (query, env) => {
  const result = await search_tmdb(query, env);
  const hasData = result.data && result.data.length > 0;
  const success = result.success && hasData;
  const response = {
    success,
    ...(success
      ? { data: result.data, site: "search-tmdb" }
      : {
          error: result.success
            ? "TMDB搜索未找到相关结果"
            : result.error || result.message || "TMDB搜索失败",
          data: [],
        }),
  };
  return makeJsonResponse(response, env);
};

const handleDoubanSearch = async (query, env) => {
  const result = await search_douban(query);
  // 如果是429或400错误，直接返回错误响应而不是包装成成功响应
  if (result.status === 429 || result.status === 400) {
    return makeJsonResponse(
      {
        success: false,
        error:
          result.error ||
          "请求过于频繁，请等待30秒后再试 | Too many requests, please wait 30 seconds and try again",
      },
      env,
      result.status
    );
  }

  const success = result.success && result.data && result.data.length > 0;
  console.log(JSON.stringify(result));
  const response = {
    success,
    ...(success
      ? { data: result.data, site: "search-douban" }
      : {
          error: result.error || result.message || "Douban搜索未找到相关结果",
          data: [],
        }),
  };
  return makeJsonResponse(response, env);
};

/**
 * 处理搜索请求的异步函数。
 * 根据指定的数据源（如IMDb或TMDb）执行相应的搜索操作，并返回格式化的JSON响应。
 *
 * @param {string} source - 搜索数据源，支持 "imdb" 或 "tmdb"。必须为字符串类型，否则返回错误响应。
 * @param {string} query - 搜索关键词，用于在指定数据源中进行查询。
 * @param {Object} env - 环境变量对象，包含与搜索相关的配置或上下文信息。
 * @returns {Promise<Object>} 返回一个JSON格式的响应对象，包含以下字段：
 *   - success: 布尔值，表示搜索是否成功。
 *   - data: 如果成功，包含搜索结果的数据；如果失败，则为空数组。
 *   - error: 如果失败，包含错误信息。
 */
const handleSearchRequest = async (source, query, env) => {
  console.log(`Processing search request: source=${source}, query=${query}`);
  if (typeof source !== "string") {
    return makeJsonResponse(
      {
        success: false,
        error: "Invalid source type. Expected string.",
      },
      env
    );
  }
  try {
    const normalizedSource = source.toLowerCase();
    const handlers = {
      imdb: handleImdbSearch,
      tmdb: handleTmdbSearch,
      douban: handleDoubanSearch,
    };
    const handler = handlers[normalizedSource];
    if (!handler) {
      return makeJsonResponse(
        {
          success: false,
          error: "Invalid source. Supported sources: imdb, tmdb",
        },
        env
      );
    }
    return await handler(query, env);
  } catch (search_error) {
    return handleSearchError(source, query, search_error);
  }
};

/**
 * 处理自动搜索请求的异步函数。
 * 根据查询文本的语言自动选择搜索源（中文使用TMDB，非中文使用IMDb）。
 *
 * @param {string} query - 搜索关键词。
 * @param {Object} env - 环境变量对象，包含与搜索相关的配置或上下文信息。
 * @returns {Promise<Object>} 返回格式化的JSON响应对象。
 */
const handleAutoSearch = async (query, env) => {
  console.log(`Processing auto search request: query=${query}`);
  if (typeof query !== "string" || !query.trim()) {
    return makeJsonResponse(
      {
        success: false,
        error: "Query parameter is missing or invalid.",
        data: [],
      },
      env
    );
  }
  try {
    const isChinese = isChineseText(query);
    let searchResult;
    let provider;

    if (isChinese) {
      console.log(`Using douban for query: ${query}`);
      const doubanResult = await search_douban(query);
      // 检查是否是因为429错误或者搜索不成功而需要回退到TMDB
      if (
        doubanResult.success &&
        doubanResult.data &&
        doubanResult.data.length > 0
      ) {
        console.log(`Douban search succeeded for query: ${query}`);
        provider = {
          search: () => doubanResult,
          site: "search-douban",
          name: "Douban",
        };
        searchResult = doubanResult;
      } else {
        console.log(
          `Douban search failed (status: ${doubanResult.status}), falling back to TMDB for query: ${query}`
        );
        provider = { search: search_tmdb, site: "search-tmdb", name: "TMDB" };
        searchResult = await search_tmdb(query, env);
      }
    } else {
      console.log(`Using IMDb for query: ${query}`);
      provider = { search: search_imdb, site: "search-imdb", name: "IMDb" };
      searchResult = await search_imdb(query);
    }

    console.log(`${provider.name} search completed for query: ${query}`);

    const hasData = searchResult.data && searchResult.data.length > 0;
    const success = searchResult.success && hasData;
    const response = {
      success,
      ...(success
        ? { data: searchResult.data, site: provider.site }
        : {
            error: searchResult.success
              ? `${provider.name} 未找到相关结果 | No results found`
              : searchResult.error ||
                searchResult.message ||
                `${provider.name} search failed due to an unknown reason.`,
            data: [],
          }),
    };
    return makeJsonResponse(response, env);
  } catch (err) {
    console.error("Error in auto search:", err.message || err);
    return makeJsonResponse(
      {
        success: false,
        error: "Search failed. Please try again later.",
        data: [],
      },
      env
    );
  }
};

/**
 * 处理搜索结果的函数。
 *
 * @param {Array} results - 搜索结果数组。如果为空或不是数组，则返回空数据对象。
 * @param {string} source - 数据来源标识符，用于选择对应的处理器。
 * @returns {Object} - 包含处理后的数据的对象，结构为 { data: [] }。
 *                    如果输入无效或无结果，data 为空数组。
 */
const processSearchResults = (results, source) => {
  if (!Array.isArray(results) || results.length === 0) return { data: [] };

  const processor = SOURCE_PROCESSORS[source] || DEFAULT_FIELDS;
  const out = results.slice(0, 10).map((raw) => {
    const item = raw && typeof raw === "object" ? raw : {};
    return processor(item, source);
  });

  return { data: out };
};

/**
 * 处理 URL 请求的异步函数。
 *
 * @param {string} url_ - 需要处理的目标 URL。
 * @param {object} env - 环境对象，包含运行时的配置或依赖。
 * @returns {Promise<object>} - 返回一个 Promise，解析为一个对象，包含以下字段：
 *   - success: {boolean} - 操作是否成功。
 *   - error: {string} - 如果失败，包含错误信息（可选）。
 *   - format: {any} - 如果成功，动态添加的格式化数据（可选）。
 */
const handleUrlRequest = async (url_, env) => {
  console.log(`Processing URL request: url=${url_}`);

  const provider = URL_PROVIDERS.find((p) =>
    p.domains.some((domain) => url_.includes(domain))
  );

  if (!provider) {
    return { success: false, error: "Unsupported URL" };
  }

  const match = url_.match(provider.regex);
  if (!match) {
    return { success: false, error: `Invalid ${provider.name} URL` };
  }

  const sid = provider.idFormatter ? provider.idFormatter(match) : match[1];
  const idOnly = sid.split("/").pop();
  const cleanResourceId = idOnly;
  console.log(`Resource ID: ${cleanResourceId}`);
  const fetchData = () => provider.generator(sid, env);
  let subType = null;
  if (provider.name === "tmdb") {
    const parts = sid.split("/");
    if (parts.length >= 2) {
      subType = parts[0];
    }
  }

  const result = await _withCache(
    cleanResourceId,
    fetchData,
    env,
    provider.name,
    subType
  );

  if (result?.success) {
    result.format = provider.formatter(result, env);
  }

  return result;
};

/**
 * 创建一个标准的JSON错误响应 (保持不变的优化点)
 * @param {string} message 错误信息
 * @param {number} status HTTP状态码
 * @param {object} corsHeaders CORS头部
 * @returns {Response}
 */
const createErrorResponse = (message, status, corsHeaders) => {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
};

/**
 * 验证请求的有效性，包括API密钥、恶意请求和速率限制
 * @param {Request} request 传入的请求对象
 * @param {object} corsHeaders CORS头部
 * @param {object} env 环境变量
 * @returns {Promise<{valid: boolean, response?: Response, clientIP?: string}>}
 */
const validateRequest = async (request, corsHeaders, env) => {
  const clientIP =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const url = new URL(request.url);
  const isInternalRequest =
    request.headers.get("X-Internal-Request") === "true";

  if (env?.API_KEY && !isInternalRequest) {
    const apiKey = url.searchParams.get("key");

    if (!apiKey) {
      // 检查是否为浏览器请求（通过 Accept 头部判断）
      const acceptHeader = request.headers.get("Accept") || "";
      const isBrowserRequest = acceptHeader.includes("text/html");

      // 对于根路径，根据请求类型决定返回什么
      if (
        (url.pathname === "/" || url.pathname === "/api") &&
        request.method === "GET" &&
        isBrowserRequest
      ) {
        return { valid: false, response: await handleRootRequest(env, true) };
      }

      return {
        valid: false,
        response: createErrorResponse(
          "API key required. Access denied.",
          401,
          corsHeaders
        ),
      };
    }

    if (apiKey !== env.API_KEY) {
      return {
        valid: false,
        response: createErrorResponse(
          "Invalid API key. Access denied.",
          401,
          corsHeaders
        ),
      };
    }
  }

  if (isMaliciousRequest(request.url)) {
    return {
      valid: false,
      response: createErrorResponse(
        "Malicious request detected. Access denied.",
        403,
        corsHeaders
      ),
    };
  }

  if (await isRateLimited(clientIP)) {
    return {
      valid: false,
      response: createErrorResponse(
        "Rate limit exceeded. Please try again later.",
        429,
        corsHeaders
      ),
    };
  }

  return { valid: true, clientIP };
};

/**
 * 创建浏览器访问时的HTML响应
 * @param {string} copyrightText 版权信息文本
 * @returns {Response}
 */
const _createBrowserResponse = (copyrightText) => {
  const html = ROOT_PAGE_CONFIG.HTML_TEMPLATE.replace(
    "__COPYRIGHT__",
    copyrightText
  );
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...CORS_HEADERS,
    },
  });
};

/**
 * 创建API访问时的JSON响应
 * @param {string} author 作者名
 * @param {object} env 环境变量
 * @returns {Response}
 */
const _createApiResponse = (author, env) => {
  const apiDoc = {
    ...ROOT_PAGE_CONFIG.API_DOC,
    Version: VERSION,
    Author: author,
    Copyright: `Powered by @${author}`,
    Security: env?.API_KEY ? "API key required for access" : "Open access",
  };
  return makeJsonResponse(apiDoc, env);
};

/**
 * 处理根路径请求的主函数
 * @param {object} env 环境变量
 * @param {boolean} isBrowser 是否为浏览器请求
 * @returns {Response}
 */
const handleRootRequest = async (env, isBrowser) => {
  const author = env?.AUTHOR || AUTHOR;
  const copyright = `Powered by @${author}`;

  if (isBrowser) {
    return _createBrowserResponse(copyright);
  } else {
    return _createApiResponse(author, env);
  }
};

/**
 * 从请求中提取参数，优先从POST body获取，失败则从URL query获取。
 * @param {Request} request
 * @param {URL} uri
 * @returns {Promise<object>} 包含所有参数的对象
 */
const _extractParams = async (request, uri) => {
  const defaults = {
    source: uri.searchParams.get("source"),
    query: uri.searchParams.get("query"),
    url: uri.searchParams.get("url"),
    tmdb_id: uri.searchParams.get("tmdb_id"),
    sid: uri.searchParams.get("sid"),
    type: uri.searchParams.get("type"),
  };

  if (request.method !== "POST") return defaults;

  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("application/json")) return defaults;

  try {
    const body = await request.json();
    return {
      source: body.source || defaults.source,
      query: body.query || defaults.query,
      url: body.url || defaults.url,
      tmdb_id: body.tmdb_id || defaults.tmdb_id,
      sid: body.sid || defaults.sid,
      type: body.type || defaults.type,
    };
  } catch (e) {
    console.warn("Failed to parse POST body as JSON:", e);
    return defaults;
  }
};

/**
 * 使用缓存机制获取资源数据，支持 R2 和 D1 双缓存层，自动处理缓存命中/未命中场景
 *
 * @param {string} resourceId - 资源唯一标识符（可能包含路径结构，如 "movies/123"）
 * @param {Function} fetchFunction - 异步函数，用于获取新鲜数据（无参数调用）
 * @param {Object} env - 环境配置对象，包含：
 *   - ENABLED_CACHE: 缓存开关（字符串，'false' 表示禁用）这个控制主要用于判断是否使用ourbits/PtGen的静态数据CDN
 *   - R2_BUCKET: R2 存储桶实例（可选）
 *   - DB: D1 数据库实例（可选）
 * @param {string} source - 数据源标识（如 'tmdb', 'douban' 等）
 * @param {string|null} [subType=null] - 子类型标识（主要用于 tmdb 源的区分）
 *
 * @returns {Promise<any>} 缓存数据或新鲜获取的数据
 *   - 若缓存命中：返回解析后的缓存对象
 *   - 若缓存未命中：返回 fetchFunction 的执行结果
 *   - 特殊情况：当数据无效（非对象）时直接返回原始值
 */
const _withCache = async (
  resourceId,
  fetchFunction,
  env,
  source,
  subType = null
) => {
  const isCacheEnabled = env.ENABLED_CACHE !== "false";
  const sourcesWithNoCache = ["douban", "imdb", "bangumi", "steam"];
  if (!isCacheEnabled && sourcesWithNoCache.includes(source)) {
    console.log(`[Cache Disabled] Fetching data for resource: ${resourceId}`);
    return await fetchFunction();
  }

  const getR2Key = () => {
    if (!source) return resourceId;
    if (source === "tmdb" && subType)
      return `${source}/${subType}/${resourceId}`;
    return `${source}/${resourceId}`;
  };

  const getD1Key = () => {
    if (!source) return resourceId;
    if (source === "tmdb" && subType)
      return `${source}_${subType}_${resourceId}`;
    return `${source}_${resourceId}`;
  };

  const r2Key = getR2Key();
  const d1Key = getD1Key();

  const [r2Result, d1Result] = await Promise.allSettled([
    env.R2_BUCKET?.get(r2Key)?.then((cached) => cached?.json()) ??
      Promise.reject("No R2"),
    env.DB?.prepare("SELECT data FROM cache WHERE key = ?")
      .bind(d1Key)
      .first()
      .then((row) => (row ? JSON.parse(row.data) : null)) ??
      Promise.reject("No D1"),
  ]);

  let cachedData = null;
  if (r2Result.status === "fulfilled" && r2Result.value) {
    cachedData = r2Result.value;
    console.log(`[Cache Hit] R2 for: ${r2Key}`);
  } else if (d1Result.status === "fulfilled" && d1Result.value) {
    cachedData = d1Result.value;
    console.log(`[Cache Hit] D1 for: ${d1Key}`);
  }

  if (cachedData) return cachedData;

  console.log(`[Cache Miss] Fetching for R2: ${r2Key}, D1: ${d1Key}`);
  const freshData = await fetchFunction();

  if (!freshData || typeof freshData !== "object" || freshData.success !== true)
    return freshData;

  const cacheData = { ...freshData };
  delete cacheData.format;
  const cacheDataStr = JSON.stringify(cacheData);

  await Promise.allSettled([
    env.R2_BUCKET?.put(r2Key, cacheDataStr) ?? Promise.reject("No R2"),
    env.DB?.prepare(
      "INSERT OR REPLACE INTO cache (key, data, timestamp) VALUES (?, ?, ?)"
    )
      .bind(d1Key, cacheDataStr, Date.now())
      .run() ?? Promise.reject("No D1"),
  ])
    .then((results) => {
      if (results[0].status === "fulfilled")
        console.log(`[Cache Write] R2 for: ${r2Key}`);
      if (results[1]?.status === "fulfilled")
        console.log(`[Cache Write] D1 for: ${d1Key}`);
    })
    .catch((e) => console.error("Cache write error:", e));

  return freshData;
};

/**
 * 根据站点类型处理奖项数据，仅当站点为豆瓣且奖项字段为字符串时进行解析。
 * @param {Object} data - 包含原始奖项数据的对象
 * @param {string} site - 站点标识符（如 'douban'）
 * @returns {Object} 处理后的数据对象（若满足条件则解析奖项字段，否则返回原对象）
 */
const processAwardsIfNeeded = (data, site) => {
  if (site === "douban" && data.awards && typeof data.awards === "string") {
    data.awards = parseDoubanAwards(data.awards);
  }
  return data;
};

/**
 * 尝试从静态CDN获取资源数据，支持多源回退机制
 *
 * 该函数按顺序尝试两个CDN地址获取JSON数据，对成功响应进行数据验证和处理。
 * 使用缓存配置优化重复请求性能，失败时自动切换备用源。
 *
 * @param {string} site - 站点标识符（将进行URL编码）
 * @param {string} trimmedSid - 修剪后的资源ID（将进行URL编码）
 * @returns {Promise<Object|null>} 处理后的数据对象（成功时）或 null（所有源失败时）
 */
const tryStaticCdn = async (site, trimmedSid) => {
  const staticUrls = [
    `https://cdn.ourhelp.club/ptgen/${encodeURIComponent(
      site
    )}/${encodeURIComponent(trimmedSid)}.json`,
    `https://ourbits.github.io/PtGen/${encodeURIComponent(
      site
    )}/${encodeURIComponent(trimmedSid)}.json`,
  ];

  for (const url of staticUrls) {
    try {
      const resp = await fetchWithTimeout(url, {
        cf: { cacheTtl: 86400, cacheEverything: true },
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data && Object.keys(data).length > 0) {
          return processAwardsIfNeeded(data, site);
        }
      }
    } catch (e) {
      console.error(
        `Static CDN fetch failed for ${site}/${trimmedSid} at ${url}:`,
        e
      );
    }
  }

  return null;
};

/**
 * 从OurBits获取静态媒体数据，优先尝试静态CDN，失败后回退到动态API
 *
 * @param {string} source - 媒体来源站点标识（将被转换为小写）
 * @param {string} sid - 媒体唯一标识（将被去除首尾空格）
 * @returns {Promise<Object|null>} 返回媒体数据对象，若所有获取方式均失败则返回null
 *
 * 流程说明：
 * 1. 优先尝试多级静态CDN获取数据（通过tryStaticCdn函数）
 * 2. 静态CDN失败时回退到动态API请求
 * 3. 动态API响应成功时处理奖项数据（通过processAwardsIfNeeded）
 * 4. 所有途径失败时返回null
 */
const getStaticMediaDataFromOurBits = async (source, sid) => {
  const site = source.toLowerCase();
  const trimmedSid = sid.trim();

  // 1. 尝试多个静态 CDN（优先级顺序）
  const staticResult = await tryStaticCdn(site, trimmedSid);
  if (staticResult) {
    return staticResult;
  }

  // 2. Fallback 到动态 API
  const dynamicUrl = `https://api.ourhelp.club/infogen?site=${encodeURIComponent(
    site
  )}&sid=${encodeURIComponent(trimmedSid)}`;
  try {
    const resp = await fetchWithTimeout(dynamicUrl, {
      headers: { "User-Agent": `PT-Gen-Refactor/${VERSION}` },
      cf: { cacheTtl: 86400, cacheEverything: true },
    });
    if (resp.ok) {
      const result = await resp.json();
      if (result) {
        processAwardsIfNeeded(result.data || result, site);
        return result;
      }
    }
  } catch (e) {
    console.error(`Dynamic API fetch failed for ${site}/${trimmedSid}:`, e);
  }

  return null;
};

/**
 * 处理查询请求的主函数，根据不同的参数执行不同的处理逻辑
 * @param {Request} request - HTTP请求对象
 * @param {Object} env - 环境变量对象，包含配置信息
 * @param {URL} uri - 解析后的URL对象
 * @returns {Promise<Response>} 返回JSON格式的响应数据
 */
const handleQueryRequest = async (request, env, uri) => {
  const params = await _extractParams(request, uri);

  try {
    if (params.url) {
      const responseData = await handleUrlRequest(params.url, env);
      return makeJsonResponse(responseData, env);
    }

    if (params.source && params.query) {
      return await handleSearchRequest(params.source, params.query, env);
    }

    if (params.query) {
      return await handleAutoSearch(params.query, env);
    }

    const source = params.tmdb_id ? "tmdb" : params.source;
    let sid = params.tmdb_id || params.sid;

    if (source && sid) {
      // TMDB 特殊处理
      if (source.toLowerCase() === "tmdb") {
        const isNumericSid = !sid.includes("/");

        if (isNumericSid) {
          if (!params.type) {
            return makeJsonResponse(
              {
                error:
                  "For TMDB requests with numeric IDs, the 'type' parameter is required. Please specify type as 'movie' or 'tv'.",
              },
              env
            );
          }

          if (params.type !== "movie" && params.type !== "tv") {
            return makeJsonResponse(
              {
                error:
                  "Invalid type parameter for TMDB. Must be 'movie' or 'tv'.",
              },
              env
            );
          }

          sid = `${params.type}/${sid}`;
        }
      }

      const provider = PROVIDER_CONFIG[source.toLowerCase()];
      if (!provider) {
        return makeJsonResponse(
          { error: `Unsupported source: ${source}` },
          env
        );
      }

      const decodedSid = String(sid).replace(/_/g, "/");
      const fetchData = () => provider.generator(decodedSid, env);
      const subType =
        source.toLowerCase() === "tmdb"
          ? decodedSid.split("/")[0] || null
          : null;

      const baseResourceId = sid.split("/").pop();
      const responseData = await _withCache(
        baseResourceId,
        fetchData,
        env,
        source.toLowerCase(),
        subType
      );

      if (responseData?.success) {
        responseData.format = provider.formatter(responseData, env);
      }

      return makeJsonResponse(responseData, env);
    }

    return makeJsonResponse(
      {
        error:
          "Invalid parameters. Please provide 'url', 'query', or 'source' and 'sid'.",
      },
      env
    );
  } catch (e) {
    console.error("Global error in handleQueryRequest:", e);
    return makeJsonResponse(
      {
        success: false,
        error: "Internal Server Error. Please contact the administrator.",
      },
      env,
      500
    );
  }
};

/**
 * 处理OPTIONS请求的函数
 *
 * 该函数用于处理HTTP OPTIONS请求，通常用于CORS预检请求
 * 返回一个状态码为204的空响应，并包含CORS相关的响应头
 *
 * @returns {Response} 返回一个HTTP响应对象，状态码为204（No Content）
 */
const _handleOptionsRequest = () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

/**
 * 创建一个表示API端点未找到的错误响应
 * @param {Object} env - 环境配置对象，用于响应处理
 * @returns {Object} 返回一个JSON格式的错误响应对象，状态码为404
 */
const _createNotFoundResponse = (env) => {
  const errorPayload = {
    success: false,
    error:
      "API endpoint not found. Please check the documentation for valid endpoints.",
  };

  return makeJsonResponse(errorPayload, env, 404);
};

/**
 * 检查请求URL是否包含恶意模式
 * @param {string} url - 要检查的URL
 * @returns {boolean} - 如果检测到恶意模式返回true，否则返回false
 */
const isMaliciousRequest = (url) => {
  if (!url || typeof url !== "string") {
    return true;
  }

  try {
    const { pathname, search } = new URL(url, "http://localhost");
    const DIRECTORY_TRAVERSAL_PATTERN = /(\.{2,}\/)/g;
    const SCRIPT_PROTOCOL_PATTERN = /(script|javascript|vbscript):/i;
    const EMBED_TAG_PATTERN = /(<\s*iframe|<\s*object|<\s*embed)/i;

    const patterns = [
      DIRECTORY_TRAVERSAL_PATTERN,
      SCRIPT_PROTOCOL_PATTERN,
      EMBED_TAG_PATTERN,
    ];

    // 使用some确保短路求值，并分别测试pathname和search
    return patterns.some((p) => p.test(pathname) || p.test(search));
  } catch (error) {
    return true;
  }
};

/**
 * 检测文本是否主要为中文
 * @param {string} text - 要检测的文本
 * @returns {boolean} - 如果文本中中文字符数量超过英文字符则返回true，否则返回false
 */
const isChineseText = (text) => {
  if (typeof text !== "string" || !text.trim()) {
    return false;
  }

  const chineseRegex =
    /[\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf\uf900-\ufaff]/g;
  const englishRegex = /[a-zA-Z]/g;
  const chineseCount = (text.match(chineseRegex) || []).length;
  const englishCount = (text.match(englishRegex) || []).length;

  if (chineseCount + englishCount < 2) {
    return chineseCount > 0;
  }

  return chineseCount > englishCount;
};

/**
 * 通用搜索函数错误处理
 * @param {string} source - 搜索源名称
 * @param {string} query - 搜索查询词
 * @param {Error} error - 捕获的错误对象
 * @returns {Object} - 格式化的错误响应对象
 */
const handleSearchError = (source, query, error) => {
  const errorResponse = {
    success: false,
    data: [],
  };

  if (error.name === "AbortError") {
    errorResponse.error = `${source} API请求超时 | ${source} API request timeout`;
  } else if (error.message) {
    errorResponse.error = error.message;
  } else {
    errorResponse.error = `Failed to search ${source} for: ${query}.`;

    if (error instanceof TypeError) {
      errorResponse.error += " Network or API error.";
    } else if (error.code === "ETIMEDOUT") {
      errorResponse.error += " Request timed out.";
    } else {
      errorResponse.error += " Please try again later.";
    }
  }

  console.error(`Search error (${source}):`, {
    query,
    error: error?.message || error,
    stack: error?.stack,
  });

  return errorResponse;
};

/**
 * 格式化角色列表，生成包含角色名称和演员列表的字符串数组。
 *
 * @param {Array} chars - 角色对象数组，默认为空数组。每个角色对象应包含以下属性：
 *   - name: 角色的英文名称（可选）。
 *   - name_cn: 角色的中文名称（可选）。
 *   - actors: 演员列表（可选），格式需与 [formatActorList] 函数兼容。
 * @returns {Array} - 返回一个字符串数组，每个字符串表示一个角色及其对应的演员列表。
 *   如果角色名称和演员列表均为空，则该角色会被过滤掉。
 */
const formatCharacters = (chars = []) => {
  return chars
    .filter((c) => c) // 跳过 falsy 值
    .map((c) => {
      const name = safe(c.name);
      const nameCn = safe(c.name_cn);
      const actors = formatActorList(c.actors);
      const title = nameCn ? `${name} (${nameCn})` : name || nameCn;
      return title ? `${title}: ${actors}` : null;
    })
    .filter(Boolean); // 移除 null/空 title
};

/**
 * 解析豆瓣奖项字符串为数组格式
 * @param {string} awardsStr - 原始奖项字符串
 * @returns {Array} 解析后的奖项数组
 */
const parseDoubanAwards = (awardsStr) => {
  if (!awardsStr || typeof awardsStr !== "string") {
    return [];
  }

  // 按双换行符分割不同电影节
  const festivals = awardsStr
    .split("\n\n")
    .filter((item) => item.trim() !== "");

  const awardItems = [];

  for (const festival of festivals) {
    // 每个电影节的信息按单个换行符分割
    const lines = festival.split("\n").filter((line) => line.trim() !== "");
    if (lines.length > 0) {
      const festivalInfo = lines[0]; // 第一行是电影节名称和年份

      // 处理该电影节的每个奖项
      const festivalAwards = [];
      for (let i = 1; i < lines.length; i++) {
        const awardLine = lines[i];
        festivalAwards.push(awardLine);
      }

      // 将电影节信息和奖项列表组合
      awardItems.push({
        festival: festivalInfo,
        awards: festivalAwards,
      });
    }
  }

  return awardItems;
};

/**
 * 处理传入的HTTP请求，根据请求方法和路径进行路由分发
 * @param {Request} request - HTTP请求对象，包含请求方法、URL、headers等信息
 * @param {Object} env - 环境变量对象，包含运行时环境配置和绑定资源
 * @returns {Promise<Response>} 返回处理后的HTTP响应对象
 */
const handleRequest = async (request, env) => {
  if (request.method === "OPTIONS") {
    return _handleOptionsRequest();
  }

  const validation = await validateRequest(request, CORS_HEADERS, env);
  if (!validation.valid) {
    return validation.response;
  }

  const url = new URL(request.url);
  const { pathname } = url;
  const { method } = request;
  const isApiPath = pathname === "/" || pathname === "/api";

  if (isApiPath) {
    if (method === "POST") {
      return await handleQueryRequest(request, env, url);
    }

    if (method === "GET") {
      const apiKey = url.searchParams.get("key");
      if (pathname === "/" && !apiKey) {
        return handleRootRequest(env, true);
      } else if (pathname === "/api" && !apiKey) {
        // /api路径无key参数：返回JSON错误
        return createErrorResponse(
          "API key required. Access denied.",
          401,
          CORS_HEADERS
        );
      } else {
        // 其他情况（有key或特定路径）：处理查询请求
        return await handleQueryRequest(request, env, url);
      }
    }
  }

  return _createNotFoundResponse(env);
};

/**
 * 从锚点元素提取文本内容
 * @param {Object} anchor - 锚点对象
 * @returns {string} 提取的文本内容
 */
const fetchAnchorText = (anchor) => {
  try {
    if (!anchor?.length) return "";

    const nextSibling = anchor[0].nextSibling;
    if (nextSibling?.nodeValue) {
      return nextSibling.nodeValue.trim();
    }

    const parent = anchor.parent();
    if (parent?.length) {
      return parent.text().replace(anchor.text(), "").trim();
    }
  } catch (error) {
    console.warn("Error in fetchAnchorText:", error);
  }
  return "";
};

/**
 * 解析 JSON-LD 结构化数据
 * @param {Object} $ - cheerio实例
 * @returns {Object} 解析后的JSON对象
 */
const parseJsonLd = ($) => {
  try {
    // 参数有效性检查
    if (!$) return {};

    const $scripts = $('head > script[type="application/ld+json"]');
    if (!$scripts.length) return {};

    const script = $scripts.first().html();
    if (!script) return {};

    // 合并替换多种空白字符以提高性能
    const cleaned = script.replace(/[\r\n\t\s]+/g, " ").trim();

    // 解析前进行基本安全性检查
    const parsed = JSON.parse(cleaned);

    // 返回解析结果前进行简单验证
    if (parsed && typeof parsed === "object") {
      return parsed;
    }

    return {};
  } catch (error) {
    console.warn("JSON-LD parsing error:", error.message || error);
    return {};
  }
};

var index = {
  fetch(request, env) {
    return handleRequest(request, env);
  }
};

export { index as default };
