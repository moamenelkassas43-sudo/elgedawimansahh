"use strict";

document.addEventListener("DOMContentLoaded",function(){
const $=id=>document.getElementById(id);
const STORAGE_KEY="tareekhAlroqiStudent";
const GROUP_URL="";
const loginForm=$("loginForm");
const loginSection=$("loginSection");
const studentArea=$("studentArea");
const mainNav=$("mainNav");
const logoutButton=$("logoutButton");
const studentNameInput=$("studentName");
const studentGradeSelect=$("studentGrade");
const formError=$("formError");
const dashboardStudentName=$("dashboardStudentName");
const dashboardStudentInfo=$("dashboardStudentInfo");
const toast=$("toast");
const groupLink=$("groupLink");
const groupButtonText=$("groupButtonText");
const groupHint=$("groupHint");
const chatForm=$("chatForm");
const chatInput=$("chatInput");
const chatMessages=$("chatMessages");
const backToTop=$("backToTop");
let toastTimer;

function showToast(message){
toast.textContent=message;
toast.classList.add("show");
clearTimeout(toastTimer);
toastTimer=setTimeout(()=>toast.classList.remove("show"),2800);
}

function showError(message){
formError.textContent=message;
formError.classList.remove("hidden");
}

function clearError(){
formError.textContent="";
formError.classList.add("hidden");
}

function selectedGender(){
const selected=document.querySelector('input[name="studentGender"]:checked');
return selected?selected.value:"";
}

function setGender(gender){
document.body.classList.toggle("theme-female",gender==="female");
}

function saveStudent(student){
try{
localStorage.setItem(STORAGE_KEY,JSON.stringify(student));
return true;
}catch(error){
showToast("تعذر حفظ البيانات على هذا الجهاز.");
return false;
}
}

function readStudent(){
try{
const raw=localStorage.getItem(STORAGE_KEY);
if(!raw)return null;
const student=JSON.parse(raw);
if(!student||typeof student.name!=="string"||typeof student.grade!=="string"||!["male","female"].includes(student.gender)){
localStorage.removeItem(STORAGE_KEY);
return null;
}
return student;
}catch(error){
return null;
}
}

function showDashboard(student){
dashboardStudentName.textContent=student.name;
dashboardStudentInfo.textContent=student.grade+" · "+(student.gender==="female"?"طالبة":"طالب");
setGender(student.gender);
loginSection.classList.add("hidden");
studentArea.classList.remove("hidden");
mainNav.classList.remove("hidden");
logoutButton.classList.remove("hidden");
}

function showLogin(){
studentArea.classList.add("hidden");
loginSection.classList.remove("hidden");
mainNav.classList.add("hidden");
logoutButton.classList.add("hidden");
setGender("");
clearError();
}

loginForm.addEventListener("submit",function(event){
event.preventDefault();
clearError();
const name=studentNameInput.value.trim();
const grade=studentGradeSelect.value;
const gender=selectedGender();

if(name.length<2){
showError("من فضلك اكتب اسمك بصورة صحيحة.");
studentNameInput.focus();
return;
}
if(!grade){
showError("من فضلك اختر الصف الدراسي.");
studentGradeSelect.focus();
return;
}
if(!gender){
showError("من فضلك اختر طالب أو طالبة.");
return;
}

const student={name,grade,gender};
saveStudent(student);
showDashboard(student);
showToast("أهلًا بك في منصة تاريخ الرقي.");
setTimeout(()=>scrollToSection("student"),100);
});

logoutButton.addEventListener("click",function(){
try{
localStorage.removeItem(STORAGE_KEY);
}catch(error){
showToast("تعذر مسح بيانات الدخول المحفوظة.");
return;
}
loginForm.reset();
showLogin();
studentNameInput.focus();
window.scrollTo({top:0,behavior:"smooth"});
showToast("تم تسجيل الخروج.");
});

document.querySelectorAll('input[name="studentGender"]').forEach(input=>{
input.addEventListener("change",()=>setGender(input.value));
});

function scrollToSection(id){
const section=$(id);
if(section)section.scrollIntoView({behavior:"smooth",block:"start"});
}

document.querySelectorAll(".nav-link").forEach(link=>{
link.addEventListener("click",function(event){
const id=this.dataset.section;
if(id==="student"&&!readStudent()){
event.preventDefault();
showToast("سجّل الدخول أولًا للوصول إلى لوحة الطالب.");
scrollToSection("loginSection");
return;
}
});
});

const observedSections=["home","courses","student","community","help"];
const navObserver=new IntersectionObserver(entries=>{
entries.forEach(entry=>{
if(!entry.isIntersecting)return;
document.querySelectorAll(".nav-link").forEach(link=>{
link.classList.toggle("active",link.dataset.section===entry.target.id);
});
});
},{rootMargin:"-25% 0px -60% 0px",threshold:0});

observedSections.forEach(id=>{
const section=$(id);
if(section)navObserver.observe(section);
});

const revealObserver=new IntersectionObserver(entries=>{
entries.forEach(entry=>{
if(entry.isIntersecting){
entry.target.classList.add("is-visible");
revealObserver.unobserve(entry.target);
}
});
},{threshold:.08});

document.querySelectorAll(".reveal").forEach(element=>revealObserver.observe(element));

window.addEventListener("scroll",function(){
backToTop.classList.toggle("visible",window.scrollY>450);
},{passive:true});

backToTop.addEventListener("click",()=>{
window.scrollTo({top:0,behavior:"smooth"});
});

function configureGroup(){
if(!GROUP_URL.trim()){
groupLink.href="#";
groupLink.classList.add("disabled-link");
groupLink.setAttribute("aria-disabled","true");
groupButtonText.textContent="رابط الجروب لم يُضف بعد";
groupHint.textContent="أضف رابط الجروب في المتغير GROUP_URL داخل ملف script.js.";
return;
}
try{
const url=new URL(GROUP_URL);
if(!["https:","http:"].includes(url.protocol))throw new Error("Invalid URL");
groupLink.href=url.href;
groupLink.target="_blank";
groupLink.rel="noopener noreferrer";
groupLink.classList.remove("disabled-link");
groupLink.removeAttribute("aria-disabled");
groupButtonText.textContent="انضم إلى جروب المنصة";
groupHint.textContent="سيتم فتح الجروب في صفحة جديدة.";
}catch(error){
groupLink.href="#";
groupLink.classList.add("disabled-link");
groupLink.setAttribute("aria-disabled","true");
groupButtonText.textContent="تحقق من رابط الجروب";
groupHint.textContent="الرابط الذي أُضيف غير صالح.";
}
}

groupLink.addEventListener("click",function(event){
if(!GROUP_URL.trim()||groupLink.getAttribute("aria-disabled")==="true"){
event.preventDefault();
showToast("رابط الجروب لم يُضف بعد.");
}
});

configureGroup();

function addChatMessage(text,type){
const message=document.createElement("div");
message.className="chat-message "+(type==="user"?"user-message":"bot-message");

const avatar=document.createElement("span");
avatar.className="chat-avatar";
const icon=document.createElement("i");
icon.className=type==="user"?"fa-solid fa-user":"fa-solid fa-robot";
avatar.appendChild(icon);

const bubble=document.createElement("div");
bubble.className="chat-bubble";
bubble.textContent=text;

message.append(avatar,bubble);
chatMessages.appendChild(message);
chatMessages.scrollTop=chatMessages.scrollHeight;
}

function getAssistantReply(question){
const q=question.toLowerCase().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/[ًٌٍَُِّْـ]/g,"");

if(/سلام|مرحبا|اهلا|ازيك|السلام عليكم/.test(q)){
return"أهلًا بك في منصة تاريخ الرقي! اسألني عن الدخول أو الدروس أو الجروب أو استخدام المنصة.";
}

if(/دخول|اسجل|تسجيل|حساب|بياناتي|نسيت/.test(q)){
return"لتسجيل الدخول، اكتب اسمك واختر صفك الدراسي والنوع، ثم اضغط «دخول المنصة». تُحفظ البيانات على المتصفح نفسه. إذا سجّلت الخروج، ستحتاج إلى إدخالها مجددًا.";
}

if(/درس|دروس|شرح|محتوى|ماده|مواد|ملخص|مراجعه|امتحان|اختبار|تدريب/.test(q)){
return"ستجد أقسام الدروس والملخصات والامتحانات في قسم «المحتوى التعليمي». الأقسام جاهزة، لكن يلزم إضافة روابط المواد والملفات الفعلية قبل أن تصبح متاحة للطلاب.";
}

if(/جروب|جروب|واتساب|تليجرام|تلجرام|فيسبوك|انضم|مجتمع/.test(q)){
if(GROUP_URL.trim()){
return"يمكنك الانضمام إلى مجتمع المنصة عبر زر «انضم إلى جروب المنصة» في قسم الجروب.";
}
return"قسم الجروب موجود في المنصة، لكن رابط الانضمام لم يُضف بعد. أضف رابط الجروب في المتغير GROUP_URL داخل ملف script.js.";
}

if(/مساعد|ذكاء اصطناعي|ai|بتفهم/.test(q)){
return"أنا مساعد محلي مخصص للأسئلة الشائعة في المنصة. لا أستخدم حاليًا نموذج ذكاء اصطناعي متصلًا بالإنترنت، لكن يمكن تطويري لاحقًا وربطي بخدمة مناسبة.";
}

if(/موبايل|هاتف|شاشه|تصميم|قائمة|شريط|تنقل/.test(q)){
return"المنصة متجاوبة مع الموبايل والكمبيوتر. على الشاشات الصغيرة يظهر شريط التنقل أسفل الشاشة، وعلى الشاشات الكبيرة يظهر أعلى المحتوى.";
}

if(/بيانات|خصوصيه|انترنت|سيرفر|محفوظ/.test(q)){
return"بيانات تسجيل الدخول محفوظة محليًا داخل المتصفح على الجهاز نفسه. هذه النسخة لا تستخدم قاعدة بيانات أو مزامنة سحابية.";
}

if(/مشكله|خطا|عطل|مش شغال|لا يعمل/.test(q)){
return"جرّب تحديث الصفحة والتأكد من وجود الملفات الثلاثة index.html وstyle.css وscript.js في المجلد نفسه. إذا استمرت المشكلة، اذكر لي ما الذي لا يعمل تحديدًا.";
}

if(/شكرا|تسلم|متشكر/.test(q)){
return"العفو! نتمنى لك رحلة تعليمية ممتعة مع منصة تاريخ الرقي. 📚";
}

return"لم أجد إجابة محددة لهذا السؤال ضمن الأسئلة المتاحة حاليًا. يمكنك السؤال عن تسجيل الدخول أو المحتوى التعليمي أو الجروب أو طريقة استخدام المنصة.";
}

function submitChat(question){
const cleaned=question.trim();
if(!cleaned)return;
addChatMessage(cleaned,"user");
chatInput.value="";
const reply=getAssistantReply(cleaned);
setTimeout(()=>addChatMessage(reply,"bot"),220);
}

chatForm.addEventListener("submit",function(event){
event.preventDefault();
submitChat(chatInput.value);
});

document.querySelectorAll(".suggestion-button").forEach(button=>{
button.addEventListener("click",()=>submitChat(button.dataset.question||button.textContent));
});

const savedStudent=readStudent();
if(savedStudent){
showDashboard(savedStudent);
}else{
showLogin();
}

});
