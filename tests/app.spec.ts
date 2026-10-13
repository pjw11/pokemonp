import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "승부를 바꾸는 숫자." }),
  ).toBeVisible();
});
test("live damage, speed toggles, point limits and full-health ability", async ({
  page,
}) => {
  const attacker = page.getByRole("region", { name: "공격 포켓몬 설정" }),
    defender = page.getByRole("region", { name: "방어 포켓몬 설정" });
  await expect(page.locator(".ko-verdict h3")).toHaveText("확정 2타");
  await expect(page.locator(".speed-number-pair strong").first()).toHaveText(
    "169",
  );
  await attacker.getByRole("switch", { name: "구애스카프" }).click();
  await expect(page.locator(".speed-number-pair strong").first()).toHaveText(
    "253",
  );
  await attacker.getByRole("switch", { name: "구애스카프" }).click();
  await expect(page.locator(".speed-number-pair strong").first()).toHaveText(
    "169",
  );
  await attacker.getByRole("switch", { name: "최속", exact: true }).click();
  await expect(page.locator(".speed-number-pair strong").first()).toHaveText(
    "122",
  );
  await attacker.getByRole("switch", { name: "최속", exact: true }).click();
  await expect(page.locator(".speed-number-pair strong").first()).toHaveText(
    "169",
  );
  await attacker
    .getByLabel("공격 공격 포인트 직접 입력", { exact: true })
    .fill("20");
  await attacker
    .getByLabel("공격 방어 포인트 직접 입력", { exact: true })
    .fill("32");
  await expect(
    attacker.getByLabel("공격 방어 포인트 직접 입력", { exact: true }),
  ).toHaveValue("12");
  await expect(attacker.locator(".point-total")).toHaveText("66 / 66");
  await attacker.getByRole("button", { name: "공격 설정 초기화" }).click();
  await defender
    .getByRole("combobox", { name: "방어 특성", exact: true })
    .selectOption("Multiscale");
  await expect(page.locator(".ko-verdict h3")).toHaveText("확정 3타");
});
test("Korean, English and initial-consonant search with regulation filtering", async ({
  page,
}) => {
  await page.locator(".attacker .species-select").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "포켓몬 검색" }).fill("ㅍㅌ");
  await expect(dialog.getByRole("button", { name: /팬텀/ })).toHaveCount(2);
  await dialog.getByRole("textbox", { name: "포켓몬 검색" }).fill("Gengar");
  await dialog.getByRole("button", { name: "팬텀 선택", exact: true }).click();
  await expect(page.locator(".attacker .species-select strong")).toHaveText(
    "팬텀",
  );
  await page.locator(".defender .species-select").click();
  await page.getByRole("textbox", { name: "포켓몬 검색" }).fill("알로라");
  await expect(
    page.getByRole("dialog").getByRole("button", { name: /라이츄/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.getByRole("combobox", { name: "레귤레이션" }).selectOption("mb");
  await expect(page.locator(".matchup-heading .subtle")).toContainText(
    "347개 폼",
  );
});
test("move picker, environment changes and immunity result", async ({
  page,
}) => {
  await page.locator(".move-selection button").click();
  await page.getByRole("textbox", { name: "기술 검색" }).fill("지진");
  await page.getByRole("dialog").getByRole("button", { name: /지진/ }).click();
  await expect(page.locator(".ko-verdict h3")).toHaveText("효과 없음");
  await page.locator(".defender .species-select").click();
  await page.getByRole("textbox", { name: "포켓몬 검색" }).fill("마기라스");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "마기라스 선택", exact: true })
    .click();
  await expect(page.locator(".ko-verdict h3")).not.toHaveText("효과 없음");
  const before = await page.locator(".damage-highlight h2").innerText();
  await page.getByRole("switch", { name: "리플렉터", exact: true }).click();
  await expect(page.locator(".damage-highlight h2")).not.toHaveText(before);
  await page.getByText("16개 난수 자세히 보기").click();
  await expect(page.locator(".roll-grid>span")).toHaveCount(16);
});
test("save, restore after reload and delete a matchup", async ({ page }) => {
  await page.getByRole("button", { name: "매치업 저장", exact: true }).click();
  await page
    .getByRole("textbox", { name: "매치업 이름" })
    .fill("테스트 한카리아스");
  await page.getByRole("button", { name: "이 브라우저에 저장" }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "저장한 매치업", exact: false })
    .click();
  await expect(
    page.getByRole("heading", { name: "테스트 한카리아스" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "계산 이어하기" }).click();
  await expect(page.locator(".attacker .species-select strong")).toHaveText(
    "한카리아스",
  );
  await page
    .getByRole("button", { name: "저장한 매치업", exact: false })
    .click();
  await page.getByRole("button", { name: "테스트 한카리아스 삭제" }).click();
  await expect(
    page.getByRole("heading", { name: "아직 저장된 매치업이 없어요" }),
  ).toBeVisible();
});
test("speed table chooses the advertised fastest target; trick room reverses order", async ({
  page,
}) => {
  await page
    .locator("nav")
    .getByRole("button", { name: "스피드 계산기", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "스피드 티어 검색" })
    .fill("한카리아스");
  const row = page.getByRole("row", {
    name: "한카리아스 비교 대상으로 선택",
    exact: true,
  });
  const advertised = await row.locator("td").nth(3).innerText();
  await row.click();
  await expect(page.locator(".speed-number-pair strong").nth(1)).toHaveText(
    advertised.trim(),
  );
  await expect(page.locator(".speed-verdict strong")).toHaveText(
    "동속 · 선공 확률 50%",
  );
  await page
    .locator(".attacker")
    .getByRole("switch", { name: "구애스카프" })
    .click();
  await expect(page.locator(".speed-verdict strong")).toHaveText(
    "한카리아스 선공",
  );
  await page.getByRole("switch", { name: "트릭룸", exact: true }).click();
  await expect(page.locator(".speed-verdict>span")).toContainText(
    "트릭룸 기준",
  );
});
test("dex, Ditto limitation, and sources are usable", async ({ page }) => {
  await page
    .locator("nav")
    .getByRole("button", { name: "포켓몬 도감", exact: true })
    .click();
  await page.getByRole("textbox", { name: "도감 검색" }).fill("메타몽");
  await page.locator(".dex-card").click();
  await expect(
    page.getByRole("heading", { name: "메타몽은 변신이 필요해요." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "매치업 저장", exact: true }).click();
  await page.getByRole("button", { name: "이 브라우저에 저장" }).click();
  await page.getByRole("button", { name: "데이터 출처 및 계산 기준" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByText("Reg M-C를 기본으로 사용하는", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Pokémon Showdown Champions" }),
  ).toHaveAttribute("href", /3a766f2/);
});
test("mobile has no overflow and all key controls remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "메뉴 열기" }).click();
  await page
    .locator("nav")
    .getByRole("button", { name: "포켓몬 도감", exact: true })
    .click();
  await page.getByRole("textbox", { name: "도감 검색" }).fill("라이츄");
  await expect(page.locator(".dex-card")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "메뉴 열기" }).click();
  await page
    .locator("nav")
    .getByRole("button", { name: "데미지 계산기", exact: true })
    .click();
  await page.locator(".attacker .species-select").click();
  await page.getByRole("textbox", { name: "포켓몬 검색" }).fill("리자몽");
  await expect(
    page.getByRole("dialog").getByRole("button", { name: /리자몽/ }),
  ).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
