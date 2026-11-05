import {test,expect,type Page} from '@playwright/test'
async function navigate(page:Page){const menu=page.getByRole('button',{name:'Open navigation'});if(await menu.isVisible())await menu.click();await page.getByRole('navigation').getByRole('button',{name:'Quizzes',exact:true}).click()}
test('trainee joins a sample game, locks an answer and sees automatic reveal results',async({page})=>{
 await page.goto('/');await navigate(page)
 const card=page.getByRole('article').filter({has:page.getByRole('heading',{name:'Web fundamentals live game'})})
 await card.getByRole('button',{name:'Browse games'}).click();await card.getByRole('button',{name:'Open game'}).click()
 await page.getByRole('button',{name:'Join game'}).click();await page.getByRole('button',{name:'Simulate teacher starting'}).click()
 await page.getByLabel('The structure of a web page').check();await page.getByRole('button',{name:'Lock answer',exact:true}).click()
 await expect(page.getByRole('button',{name:'Answer locked',exact:true})).toBeDisabled()
 await page.getByRole('button',{name:'Simulate teacher revealing'}).click();await expect(page.locator('.quiz-game')).toContainText('Correct answer: The structure of a web page')
 await expect(page.locator('.quiz-standings')).toContainText('10')
})
test('teacher authors a complete game quiz and publishes its configured correct answer',async({page})=>{
 await page.goto('/');await page.getByLabel('Preview as').selectOption('Trainer');await navigate(page)
 await page.getByRole('button',{name:'Create quiz'}).click();await page.getByLabel('Title',{exact:true}).fill('Synthetic custom quiz')
 await page.getByLabel('Mode',{exact:true}).selectOption('game');await page.getByLabel('Each question (seconds)').fill('20')
 await page.getByLabel('Scoring',{exact:true}).selectOption('correct');await page.getByLabel('Show leaderboard').selectOption('each_question')
 await page.getByRole('button',{name:'Add question',exact:true}).click();await page.getByLabel('Question text').fill('Synthetic custom question')
 await page.getByLabel('Option 1',{exact:true}).fill('Correct sample option');await page.getByLabel('Option 2',{exact:true}).fill('Other sample option');await page.getByLabel('Correct',{exact:true}).first().check()
 await page.getByRole('button',{name:'Save quiz draft'}).click();await page.getByLabel('Reason for publishing, closing or releasing').fill('Reviewed synthetic settings')
 const card=page.getByRole('article').filter({has:page.getByRole('heading',{name:'Synthetic custom quiz'})});await card.getByRole('button',{name:'Publish quiz'}).click()
 await expect(card).toContainText('published');await card.getByRole('button',{name:'Host / resume game'}).click();await page.getByRole('button',{name:'Start first question'}).click()
 await expect(page.locator('.quiz-game')).toContainText('Synthetic custom question')
})
test('unsupported fullscreen preflight does not start a sample exam',async({page})=>{
 await page.addInitScript(()=>{HTMLElement.prototype.requestFullscreen=async()=>{throw new Error('Unsupported synthetic browser')}})
 await page.goto('/');await navigate(page);await page.getByRole('button',{name:'Start / resume exam'}).click()
 await expect(page.locator('.quiz-exam')).toHaveCount(0);await expect(page.getByRole('status').filter({hasText:'Unsupported synthetic browser'})).toBeVisible()
})
test('sample exam with simulated fullscreen auto-grades and flags visibility without a cheating verdict',async({page})=>{
 await page.addInitScript(()=>{
  HTMLElement.prototype.requestFullscreen=async function(){Object.defineProperty(document,'fullscreenElement',{configurable:true,value:this});document.dispatchEvent(new Event('fullscreenchange'))}
  document.exitFullscreen=async()=>{Object.defineProperty(document,'fullscreenElement',{configurable:true,value:null});document.dispatchEvent(new Event('fullscreenchange'))}
 })
 await page.goto('/');await navigate(page);await page.getByRole('button',{name:'Start / resume exam'}).click()
 await page.getByLabel('The structure of a web page').check()
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'))})
 await expect(page.locator('.quiz-exam')).toContainText('does not determine cheating')
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Submit exam',exact:true}).click()
 await expect(page.locator('.quiz-exam')).toContainText('Result: 10 / 10')
})
